"use client";

import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { HtmlPreview } from "@/components/ui/html-preview";
import { Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/utils/cn";
import { formatDay } from "@/lib/utils/date";
import { aspectRatio, formatLabel } from "@/lib/formats";
import {
  hasPreview,
  isApproved,
  isReviewable,
  pageDimensions,
  pageImageUrl,
  pagePreviewHtml,
  composedPages,
  previewPages,
  postCaption,
  type Post,
} from "@/lib/api/types";

/**
 * One post in a browse grid.
 *
 * Neutral surface on purpose — the review card impersonates the destination
 * platform because a draft has to be judged in the frame it will publish into,
 * but a grid is not that moment, and five platform skins side by side is noise
 * standing in for information.
 */
export function PostTile({ post, brandName }: { post: Post; brandName?: string }) {
  const caption = postCaption(post) || "Untitled post";
  const pageCount = composedPages(post).length;

  return (
    <li>
      <Link
        href={`/posts/${post.id}`}
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface",
          "transition-colors hover:border-ink/20",
        )}
      >
        <Thumbnail post={post} />

        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="line-clamp-2 text-sm font-medium text-ink">{caption}</p>

          <div className="mt-auto flex items-center gap-2 text-xs text-ink-subtle">
            <StageBadge post={post} />
            <span aria-hidden>·</span>
            <span className="truncate">{brandName ?? formatLabel(post.format)}</span>
            <span className="ml-auto shrink-0 tabular-nums">
              {pageCount > 1 ? `${pageCount} slides · ` : ""}
              {formatDay(post.created_at)}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

/**
 * The design, at tile size.
 *
 * Prefers the markup over the PNG, which inverts what a gallery would normally
 * do. Under `STORAGE_BACKEND=local` — the API default — every `page.url` is a
 * path inside the API container that nothing serves, so an image-first tile is
 * blank for every post on a stock setup. The HTML is always there once a post
 * is composed, and `HtmlPreview` measures and scales itself, so it drops in at
 * any size. See README's "Known limitation: local storage mode".
 */
function Thumbnail({ post }: { post: Post }) {
  const page = previewPages(post)[0] ?? composedPages(post)[0];
  const html = page ? pagePreviewHtml(page) : null;
  const image = page ? pageImageUrl(page) : null;

  const design = page ? pageDimensions(page, post.format) : null;

  // The tile wears the post's own shape rather than a house 4:5. Postner's six
  // formats run from 16:9 to 9:16, so a single box either crops most of them or
  // letterboxes them — an X post inside a 4:5 tile spends over half its height
  // on empty bands. Shape is information here: it is the frame the post will
  // publish into. Rows are `items-start` so the ragged heights do not stretch
  // their neighbours.
  const aspect = design
    ? design.width / design.height
    : aspectRatio(post.format);

  return (
    <div
      className="relative overflow-hidden border-b border-border bg-bg"
      style={{ aspectRatio: aspect }}
    >
      {html && design ? (
        <>
          {/* A design is a full 1080px document in a sandboxed frame and takes
              a beat to paint — several seconds with a grid of them. Without
              something underneath, that beat reads as a broken tile. */}
          <Skeleton className="absolute inset-0 rounded-none" />
          <HtmlPreview
            html={html}
            width={design.width}
            height={design.height}
            title=""
            className="absolute inset-0"
          />
        </>
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-ink-subtle">
          <ImageIcon className="size-7" aria-hidden />
        </div>
      )}
    </div>
  );
}

/**
 * Where the post is, in one phrase.
 *
 * Reads from `hasPreview` rather than the raw status because that is the gate
 * the review queue itself uses — a post is reviewable once its design HTML
 * exists, whatever the status column says on the way there.
 */
function StageBadge({ post }: { post: Post }) {
  const { label, tone } = stage(post);
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", tone)} aria-hidden />
      {label}
    </span>
  );
}

function stage(post: Post): { label: string; tone: string } {
  if (isApproved(post)) return { label: "Approved", tone: "bg-approve" };
  if (!isReviewable(post)) return { label: "Rejected", tone: "bg-reject" };
  if (hasPreview(post)) return { label: "Ready to review", tone: "bg-accent" };
  if (post.status === "drafted") return { label: "Writing copy", tone: "bg-ink/25" };
  if (post.status === "imaged") return { label: "Making images", tone: "bg-ink/25" };
  return { label: "Composing", tone: "bg-ink/25" };
}

/**
 * The browse grid both list screens use.
 *
 * Brand names are resolved here rather than per tile so the lookup is built
 * once instead of once per card.
 */
export function PostGrid({
  posts,
  brands,
}: {
  posts: Post[];
  brands: { id: string; name: string }[] | undefined;
}) {
  const names = new Map((brands ?? []).map((brand) => [brand.id, brand.name]));
  return (
    <ul className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {posts.map((post) => (
        <PostTile
          key={post.id}
          post={post}
          brandName={names.get(post.brand_id ?? "")}
        />
      ))}
    </ul>
  );
}
