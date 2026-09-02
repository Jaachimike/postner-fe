"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PreviewNote } from "@/components/ui/html-preview";
import { PostChrome } from "@/components/post/chrome";
import { chromeMedia } from "@/components/post/chrome/meta";
import { MediaFrame } from "@/components/post/media-frame";
import { PostCarousel } from "@/components/post/post-carousel";
import {
  findSlide,
  needsRecompose,
  postCaption,
  postHandle,
  previewPages,
  slideCaption,
  type Post,
} from "@/lib/api/types";
import { aspectRatio, formatLabel, isImmersive } from "@/lib/formats";
import type { Brand } from "@/lib/api/types";

/**
 * The review card.
 *
 * It wears the chrome of the platform the post is destined for — see
 * `chrome/index.tsx` — so the draft is judged in the frame it will actually
 * appear in rather than as a tweet regardless of format. The app canvas stays
 * light either way; only the card changes.
 *
 * Two things worth knowing before editing:
 *
 *  - The format's frame wins over the design's own size. Every pack page
 *    hardcodes 1080×1350 whatever the post's format is, so a 16:9 X post shows
 *    a letterboxed 4:5 design. That is the honest depiction of the crop the
 *    render will apply, not a layout bug.
 *  - The platform's action glyphs are decorative and hidden from assistive
 *    tech. The real actions are the FABs below the card.
 */
export function PostCard({
  post,
  brand,
  slideIndex,
  onSlideIndexChange,
  className,
}: {
  post: Post;
  brand?: Brand;
  /**
   * Controlled: the visible slide lives in `ReviewSurface` so the reject and
   * edit sheets can open on the slide being looked at. See the comment there
   * for why they are handed a `page_id` rather than this number.
   */
  slideIndex: number;
  onSlideIndexChange: (index: number) => void;
  className?: string;
}) {
  // Only pages with markup: a dot that leads to "preview not ready" is a dot
  // that lies about what is reviewable. The queue gate already admits posts on
  // this basis, so this aligns the pager with it.
  const pages = previewPages(post);
  const index = Math.min(slideIndex, Math.max(pages.length - 1, 0));

  const stale = needsRecompose(post);
  const hasDesign = !stale && pages.length > 0;
  const media = chromeMedia(post.format);

  // An immersive chrome floats one caption over the media and has no room for
  // the carousel's own copy line, so for those formats the slide's copy becomes
  // the overlay — which is the more useful of the two when reviewing a pack.
  const slide = slideCaption(findSlide(post.content?.slides, pages[index]?.page_id ?? ""));
  const caption =
    isImmersive(post.format) && slide
      ? [slide.title, slide.body].filter(Boolean).join(" ")
      : postCaption(post);

  const displayName = brand?.name ?? post.content?.brand ?? "Your brand";
  const identity = {
    displayName,
    handle: postHandle(displayName),
    logo: brand?.logo ?? null,
    initial: displayName.slice(0, 1).toUpperCase(),
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        // A 9:16 frame at the review column's full width would stand nearly a
        // thousand pixels tall and push the FABs off-screen. Capping here
        // rather than in the chrome keeps the meta line under the card aligned
        // with it.
        isImmersive(post.format) && "mx-auto w-full max-w-[20rem]",
        className,
      )}
    >
      <PostChrome
        post={post}
        brand={brand}
        identity={identity}
        caption={caption}
        hasDesign={hasDesign}
        media={
          hasDesign ? (
            <PostCarousel
              pages={pages}
              slides={post.content?.slides}
              format={post.format}
              index={index}
              onIndexChange={onSlideIndexChange}
              variant={media.variant}
              frameClassName={media.frameClassName}
            />
          ) : (
            <MediaFrame
              frameAspect={aspectRatio(post.format)}
              className={media.frameClassName}
            >
              {stale ? (
                <PreviewNote
                  title="Photos need rebuilding"
                  body="This post was made before images moved to storage, so its photos cannot load. Edit it, or generate new photos, to rebuild the design."
                />
              ) : (
                <PreviewNote
                  title="Preview not ready"
                  body="The design has not been built for this page yet. Re-run the edit, or compose the post again."
                />
              )}
            </MediaFrame>
          )
        }
      />

      <PostMeta post={post} />
    </div>
  );
}

/**
 * Postner's own notes about the draft, deliberately outside the platform
 * surface: the format label belongs to the review tool, not to the post.
 * The slide count is not repeated here — the carousel's counter says it.
 */
function PostMeta({ post }: { post: Post }) {
  return (
    <footer className="flex flex-col gap-1.5 px-1 text-sm">
      <p className="text-ink-muted">{formatLabel(post.format)}</p>
      {post.content?.source_title ? (
        <p className="flex items-start gap-1.5 text-ink-muted">
          <Info className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0">
            Drafted from &ldquo;{post.content.source_title}&rdquo;
          </span>
        </p>
      ) : null}
    </footer>
  );
}
