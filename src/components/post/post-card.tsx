"use client";

import * as React from "react";
import Image from "next/image";
import {
  BadgeCheck,
  BarChart2,
  Heart,
  ImageOff,
  MessageCircle,
  Repeat2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  composedPages,
  pageImageUrl,
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
  const imageUrl = current ? pageImageUrl(current) : null;

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
          <div
            className="relative w-full overflow-hidden rounded-xl bg-card-elevated"
            style={{ aspectRatio: aspectRatio(post.format) }}
          >
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={`${formatLabel(post.format)} preview, page ${page + 1}`}
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, 520px"
                className="object-cover"
              />
            ) : (
              <UnavailablePreview />
            )}
          </div>

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

/**
 * Composed pages only carry a browser-usable URL when the API runs with
 * STORAGE_BACKEND=s3. On the default `local` backend the API hands back a
 * container filesystem path and serves no route for it, so say so plainly
 * rather than rendering a broken image.
 */
function UnavailablePreview() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 px-6 text-center">
      <ImageOff className="size-6 text-card-muted" aria-hidden />
      <p className="text-sm font-medium text-card-ink">Preview not available</p>
      <p className="max-w-xs text-xs leading-relaxed text-card-muted">
        The design rendered, but the API is running with local storage and does
        not serve the file over HTTP. Set STORAGE_BACKEND=s3 to see it here.
      </p>
    </div>
  );
}
