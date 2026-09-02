import {
  BadgeCheck,
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { CardShell, ChromeAvatar, GlyphRow } from "@/components/post/chrome/parts";
import type { PostChromeProps } from "@/components/post/chrome/types";
import { formatLabel, isImmersive } from "@/lib/formats";

/**
 * Instagram, in two shapes.
 *
 * Feed and portrait are a light card: header, full-bleed media, action row,
 * then the caption *below* prefixed by the username — Instagram's ordering, and
 * the opposite of X's.
 *
 * A story is immersive: black, full-bleed, chrome floating over the media. Its
 * phone-width cap lives on `PostCard`, not here, so the meta line under the
 * card stays aligned with it.
 */
export function IgChrome(props: PostChromeProps) {
  return isImmersive(props.post.format) ? <IgStory {...props} /> : <IgFeed {...props} />;
}

function IgFeed({ post, identity, caption, media }: PostChromeProps) {
  return (
    <CardShell
      tone="light"
      ariaLabel={`${formatLabel(post.format)} preview for ${identity.displayName}`}
    >
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <ChromeAvatar
          identity={identity}
          size="sm"
          ring
          fallbackClassName="bg-social-border text-social-ink"
        />
        <p className="flex min-w-0 items-center gap-1 text-sm font-semibold leading-tight">
          {/* Instagram shows the username, not a display name. */}
          <span className="truncate">{identity.handle.replace(/^@/, "")}</span>
          <BadgeCheck className="size-3.5 shrink-0 text-ig-accent" aria-hidden />
        </p>
        <MoreHorizontal className="ml-auto size-4 shrink-0 text-social-muted" aria-hidden />
      </header>

      {media}

      <GlyphRow
        items={[{ icon: Heart }, { icon: MessageCircle }, { icon: Send }]}
        className="gap-4 px-3 pt-3"
      />

      {caption ? (
        <p className="whitespace-pre-wrap px-3 pb-3 pt-2 text-sm leading-[1.45]">
          <span className="font-semibold">{identity.handle.replace(/^@/, "")}</span>{" "}
          {caption}
        </p>
      ) : (
        <div className="pb-3" />
      )}
    </CardShell>
  );
}

function IgStory({ post, identity, caption, media, hasDesign }: PostChromeProps) {
  return (
    <CardShell
      tone="dark"
      ariaLabel={`${formatLabel(post.format)} preview for ${identity.displayName}`}
      className="bg-black text-white"
    >
      <div className="relative">
        {media}

        {/* The pager's segmented bars are drawn by the carousel at the top, so
            the identity row sits just under them. */}
        <header className="pointer-events-none absolute inset-x-3 top-6 flex items-center gap-2">
          <ChromeAvatar
            identity={identity}
            size="sm"
            ring
            fallbackClassName="bg-white/15 text-white"
          />
          <p className="flex min-w-0 items-center gap-1 text-sm font-semibold leading-tight drop-shadow">
            <span className="truncate">{identity.handle.replace(/^@/, "")}</span>
            <BadgeCheck className="size-3.5 shrink-0 text-ig-accent" aria-hidden />
          </p>
        </header>

        {/* With no design to show, the frame is holding an explanation of why.
            Overlaying decoration on top of it would bury the one thing worth
            reading. */}
        {hasDesign ? (
          <>
            {caption ? (
              <p className="pointer-events-none absolute inset-x-3 bottom-14 whitespace-pre-wrap text-sm leading-snug drop-shadow">
                {caption}
              </p>
            ) : null}

            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center gap-3">
              <span
                aria-hidden
                className="min-w-0 flex-1 truncate rounded-full border border-white/40 px-3 py-1.5 text-xs text-white/70"
              >
                Send message
              </span>
              <GlyphRow items={[{ icon: Send }, { icon: Bookmark }]} className="gap-3" />
            </div>
          </>
        ) : null}
      </div>
    </CardShell>
  );
}
