"use client";

import * as React from "react";
import {
  BadgeCheck,
  BarChart2,
  Heart,
  MessageCircle,
  Repeat2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { HtmlPreview, PreviewNote } from "@/components/ui/html-preview";
import {
  composedPages,
  needsRecompose,
  pageDimensions,
  pagePreviewHtml,
  postHandle,
  type Post,
} from "@/lib/api/types";
import { aspectRatio, formatLabel } from "@/lib/formats";
import type { Brand } from "@/lib/api/types";

/**
 * The review card, per docs/review-screen-reference.png.
 *
 * Deliberately inverted against the light app canvas: the thing you made is
 * the dark object in a quiet room. It also borrows platform chrome (avatar,
 * handle, action glyphs) so the draft is judged as it will actually appear.
 */
export function PostCard({
  post,
  brand,
  className,
}: {
  post: Post;
  brand?: Brand;
  className?: string;
}) {
  const pages = composedPages(post);
  const [page, setPage] = React.useState(0);
  const current = pages[Math.min(page, Math.max(pages.length - 1, 0))];
  const html = current ? pagePreviewHtml(current) : null;
  const size = current ? pageDimensions(current, post.format) : null;
  const stale = needsRecompose(post);

  const displayName = brand?.name ?? post.content?.brand ?? "Your brand";
  const body =
    post.content?.ig_fb_caption ??
    post.content?.overlay_text ??
    post.content?.slides?.[page]?.body ??
    "";

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-card bg-card p-5 text-card-ink shadow-xl shadow-ink/10",
        className,
      )}
    >
      <header className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-card-elevated text-sm font-semibold text-card-muted">
          {brand?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logo} alt="" className="size-full object-cover" />
          ) : (
            displayName.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[0.9375rem] font-semibold leading-tight">
            <span className="truncate">{displayName}</span>
            <BadgeCheck className="size-4 shrink-0 text-accent" aria-hidden />
          </p>
          <p className="truncate text-sm text-card-muted">{postHandle(displayName)}</p>
        </div>
      </header>

      {body ? (
        <p className="whitespace-pre-wrap text-[0.9375rem] font-medium leading-[1.55]">
          {body}
        </p>
      ) : null}

      {pages.length > 0 ? (
        <figure className="flex flex-col gap-2">
          {stale ? (
            <div
              className="relative w-full overflow-hidden rounded-xl bg-card-elevated"
              style={{ aspectRatio: aspectRatio(post.format) }}
            >
              <PreviewNote
                title="Photos need rebuilding"
                body="This post was made before images moved to storage, so its photos cannot load. Edit it, or generate new photos, to rebuild the design."
              />
            </div>
          ) : html && size ? (
            <HtmlPreview
              html={html}
              width={size.width}
              height={size.height}
              title={`${formatLabel(post.format)} preview, page ${page + 1}`}
              className="rounded-xl bg-card-elevated"
            />
          ) : (
            <div
              className="relative w-full overflow-hidden rounded-xl bg-card-elevated"
              style={{ aspectRatio: aspectRatio(post.format) }}
            >
              <PreviewNote
                title="Preview not ready"
                body="The design has not been built for this page yet. Re-run the edit, or compose the post again."
              />
            </div>
          )}

          {pages.length > 1 ? (
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              {pages.map((entry, index) => (
                <button
                  key={entry.page_id}
                  type="button"
                  aria-label={`Slide ${index + 1} of ${pages.length}`}
                  aria-current={index === page}
                  onClick={() => setPage(index)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    index === page ? "w-5 bg-card-ink" : "w-1.5 bg-card-muted/50",
                  )}
                />
              ))}
            </div>
          ) : null}
        </figure>
      ) : null}

      <div className="flex items-center gap-8 border-t border-card-border pt-3 text-card-muted">
        {[MessageCircle, Repeat2, Heart, BarChart2].map((Icon, index) => (
          <Icon key={index} className="size-[1.125rem]" aria-hidden />
        ))}
      </div>

      <footer className="flex flex-col gap-1.5 text-sm">
        <p className="text-card-muted">
          {formatLabel(post.format)}
          {pages.length > 1 ? ` · ${pages.length} slides` : ""}
        </p>
        {post.content?.source_title ? (
          <p className="flex items-start gap-1.5 text-accent">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0">
              Drafted from &ldquo;{post.content.source_title}&rdquo;
            </span>
          </p>
        ) : null}
      </footer>
    </article>
  );
}
