import { BadgeCheck, BarChart2, Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { CardShell, ChromeAvatar, GlyphRow } from "@/components/post/chrome/parts";
import type { PostChromeProps } from "@/components/post/chrome/types";
import { formatLabel } from "@/lib/formats";

/**
 * X: black card, caption above the media, media inset and bordered.
 *
 * The only chrome that does not run its media to the card edge — X frames a
 * quoted image rather than presenting it.
 */
export function XChrome({ post, identity, caption, media }: PostChromeProps) {
  return (
    <CardShell
      tone="dark"
      ariaLabel={`${formatLabel(post.format)} preview for ${identity.displayName}`}
      className="gap-3 bg-black p-4 text-x-ink"
    >
      <header className="flex items-center gap-3">
        <ChromeAvatar
          identity={identity}
          fallbackClassName="bg-x-elevated text-x-muted"
        />
        <p className="flex min-w-0 items-center gap-1 text-[0.9375rem] leading-tight">
          <span className="truncate font-semibold">{identity.displayName}</span>
          <BadgeCheck className="size-4 shrink-0 text-x-accent" aria-hidden />
          <span className="truncate text-x-muted">{identity.handle}</span>
        </p>
      </header>

      {caption ? (
        <p className="whitespace-pre-wrap text-[0.9375rem] leading-[1.55]">{caption}</p>
      ) : null}

      {media}

      <GlyphRow
        items={[
          { icon: MessageCircle },
          { icon: Repeat2 },
          { icon: Heart },
          { icon: BarChart2 },
          { icon: Share },
        ]}
        className="justify-between border-t border-x-border pt-3 text-x-muted"
      />
    </CardShell>
  );
}
