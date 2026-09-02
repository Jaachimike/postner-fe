import { Bookmark, Heart, MessageCircle, Music2, Plus, Share2 } from "lucide-react";
import { CardShell, ChromeAvatar, GlyphRow } from "@/components/post/chrome/parts";
import type { PostChromeProps } from "@/components/post/chrome/types";
import { formatLabel } from "@/lib/formats";

/**
 * TikTok: black, full-bleed, a vertical action rail on the right and the copy
 * overlaid bottom-left. No verified tick — TikTok does not badge in-feed.
 *
 * Like the Instagram story, this is capped to a phone's width — but that cap
 * lives on `PostCard`, so the meta line under the card stays aligned with it.
 */
export function TikTokChrome({ post, identity, caption, media, hasDesign }: PostChromeProps) {
  return (
    <CardShell
      tone="dark"
      ariaLabel={`${formatLabel(post.format)} preview for ${identity.displayName}`}
      className="bg-black text-white"
    >
      <div className="relative">
        {media}

        {/* Suppressed without a design, so the rail does not sit on top of the
            note explaining what went wrong. */}
        {hasDesign ? (
          <>
            <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col items-center gap-5">
              <span className="relative mb-2">
                <ChromeAvatar
                  identity={identity}
                  size="sm"
                  fallbackClassName="bg-white/15 text-white"
                />
                <span
                  aria-hidden
                  className="absolute -bottom-1.5 left-1/2 grid size-4 -translate-x-1/2 place-items-center rounded-full bg-tt-accent"
                >
                  <Plus className="size-3" />
                </span>
              </span>
              <GlyphRow
                items={[{ icon: Heart }, { icon: MessageCircle }, { icon: Bookmark }, { icon: Share2 }]}
                className="flex-col gap-5 drop-shadow"
              />
            </div>

            <div className="pointer-events-none absolute inset-x-3 bottom-3 pr-16">
              <p className="text-sm font-semibold drop-shadow">{identity.handle}</p>
              {caption ? (
                <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-snug drop-shadow">
                  {caption}
                </p>
              ) : null}
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/80">
                <Music2 className="size-3 shrink-0" aria-hidden />
                <span className="truncate">original sound — {identity.displayName}</span>
              </p>
            </div>
          </>
        ) : null}
      </div>
    </CardShell>
  );
}
