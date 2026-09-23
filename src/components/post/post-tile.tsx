"use client";

import * as React from "react";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { HtmlPreview } from "@/components/ui/html-preview";
import { Spinner } from "@/components/ui/feedback";
import { DownloadApprovedButton } from "@/components/review/download-approved-button";
import { SchedulePostButton } from "@/components/social/schedule-post-button";
import { ScheduledBadge } from "@/components/social/scheduled-badge";
import { cn } from "@/lib/utils/cn";
import { formatDay } from "@/lib/utils/date";
import { aspectRatio, formatLabel } from "@/lib/formats";
import {
  hasPreview,
  isApproved,
  pageDimensions,
  pageImageUrl,
  pagePreviewHtml,
  composedPages,
  previewPages,
  postCaption,
  primaryScheduledPost,
  type Post,
  type ScheduledPost,
} from "@/lib/api/types";

/**
 * One post in a browse grid.
 *
 * Neutral surface on purpose — the review card impersonates the destination
 * platform because a draft has to be judged in the frame it will publish into,
 * but a grid is not that moment, and five platform skins side by side is noise
 * standing in for information.
 */
export function PostTile({
  post,
  brandName,
  scheduled,
}: {
  post: Post;
  brandName?: string;
  /** The publish row worth showing, when this grid knows about scheduling. */
  scheduled?: ScheduledPost | null;
}) {
  const caption = postCaption(post) || "Untitled post";
  const pageCount = composedPages(post).length;

  return (
    <li className="relative">
      <Link
        href={`/posts/${post.id}`}
        className={cn(
          "group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface",
          "transition-colors hover:border-ink/20",
        )}
      >
        <Thumbnail post={post} />

        <div className="flex flex-col gap-2 p-4">
          <p className="line-clamp-2 text-sm font-medium text-ink">{caption}</p>

          {scheduled ? <ScheduledBadge scheduled={scheduled} className="self-start" /> : null}

          <div className="flex items-center gap-2 text-xs text-ink-subtle">
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
      {isApproved(post) ? (
        <div className="absolute right-3 top-3 z-10 flex items-start gap-2">
          <SchedulePostButton post={post} variant="overlay" />
          <DownloadApprovedButton
            postId={post.id}
            format={post.format}
            variant="overlay"
          />
        </div>
      ) : null}
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
  // publish into.
  const aspect = design
    ? design.width / design.height
    : aspectRatio(post.format);

  return (
    <div
      className="relative overflow-hidden border-b border-border bg-bg"
      style={{ aspectRatio: aspect }}
    >
      {html && design ? (
        <HtmlPreview
          html={html}
          width={design.width}
          height={design.height}
          title=""
          className="absolute inset-0"
        />
      ) : image ? (
        <TileImage src={image} />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-ink-subtle">
          <ImageIcon className="size-7" aria-hidden />
        </div>
      )}
    </div>
  );
}

/** PNG fallback: hold a spinner until the photo itself has decoded. */
function TileImage({ src }: { src: string }) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(false);
  }, [src]);

  return (
    <>
      {!ready ? (
        <div
          className="absolute inset-0 grid place-items-center bg-ink/[0.04]"
          aria-busy="true"
          aria-label="Loading preview"
        >
          <Spinner className="size-5" />
        </div>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        onLoad={() => setReady(true)}
        onError={() => setReady(true)}
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity duration-150",
          ready ? "opacity-100" : "opacity-0",
        )}
      />
    </>
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
  if (post.status === "rejected") return { label: "Rejected", tone: "bg-reject" };
  if (post.meta?.pipeline_status === "failed") {
    return { label: "Failed", tone: "bg-reject" };
  }
  if (hasPreview(post)) return { label: "Ready to review", tone: "bg-accent" };
  if (post.status === "drafting" || post.status === "drafted") {
    return { label: "Writing copy", tone: "bg-ink/25" };
  }
  if (post.status === "imaged") return { label: "Making images", tone: "bg-ink/25" };
  return { label: "Composing", tone: "bg-ink/25" };
}

/** Matches `sm:grid-cols-2 xl:grid-cols-3` without syncing state in an effect. */
function useGridColumnCount(): number {
  return React.useSyncExternalStore(
    subscribeGridColumns,
    getGridColumnCount,
    () => 1,
  );
}

function subscribeGridColumns(onStoreChange: () => void) {
  const sm = window.matchMedia("(min-width: 640px)");
  const xl = window.matchMedia("(min-width: 1280px)");
  sm.addEventListener("change", onStoreChange);
  xl.addEventListener("change", onStoreChange);
  return () => {
    sm.removeEventListener("change", onStoreChange);
    xl.removeEventListener("change", onStoreChange);
  };
}

function getGridColumnCount() {
  if (window.matchMedia("(min-width: 1280px)").matches) return 3;
  if (window.matchMedia("(min-width: 640px)").matches) return 2;
  return 1;
}

function splitAcrossColumns<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    columns[index % columnCount].push(item);
  });
  return columns;
}

/**
 * The browse grid both list screens use.
 *
 * Cards keep their natural (format-driven) height. CSS Grid would force every
 * item in a row to share the tallest card's track, leaving empty bands under
 * shorter formats — so posts are packed into columns instead, round-robin, to
 * preserve left-to-right order without stretching or resizing tiles.
 *
 * Brand names are resolved here rather than per tile so the lookup is built
 * once instead of once per card.
 */
export function PostGrid({
  posts,
  brands,
  scheduled,
}: {
  posts: Post[];
  brands: { id: string; name: string }[] | undefined;
  /**
   * Every scheduled-publish row the page loaded, not one per tile. The grid
   * picks each post's out of the list so the screen makes one request rather
   * than one per card.
   */
  scheduled?: ScheduledPost[];
}) {
  const names = new Map((brands ?? []).map((brand) => [brand.id, brand.name]));
  const columnCount = useGridColumnCount();
  const columns = splitAcrossColumns(posts, columnCount);

  return (
    <div className="flex items-start gap-4">
      {columns.map((column, columnIndex) => (
        <ul key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-4">
          {column.map((post) => (
            <PostTile
              key={post.id}
              post={post}
              brandName={names.get(post.brand_id ?? "")}
              scheduled={
                scheduled ? primaryScheduledPost(scheduled, post.id) : null
              }
            />
          ))}
        </ul>
      ))}
    </div>
  );
}
