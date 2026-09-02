import { BadgeCheck, Globe, MessageCircle, MoreHorizontal, Share, ThumbsUp } from "lucide-react";
import { CardShell, ChromeAvatar, GlyphRow } from "@/components/post/chrome/parts";
import type { PostChromeProps } from "@/components/post/chrome/types";
import { formatLabel } from "@/lib/formats";

/**
 * Facebook: light card, full name over an audience line, caption above the
 * media, and an action row whose glyphs carry visible labels.
 *
 * Those labels are the reason `GlyphRow` renders spans rather than buttons —
 * three things that read as "Like / Comment / Share" but do nothing would be
 * worse than no chrome at all for anyone navigating by keyboard or screen
 * reader, so the whole row is hidden from assistive tech.
 */
export function FbChrome({ post, identity, caption, media }: PostChromeProps) {
  return (
    <CardShell
      tone="light"
      ariaLabel={`${formatLabel(post.format)} preview for ${identity.displayName}`}
    >
      <header className="flex items-center gap-2.5 px-4 py-3">
        <ChromeAvatar
          identity={identity}
          fallbackClassName="bg-social-border text-social-ink"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[0.9375rem] font-semibold leading-tight">
            <span className="truncate">{identity.displayName}</span>
            <BadgeCheck className="size-4 shrink-0 text-fb-accent" aria-hidden />
          </p>
          <p className="flex items-center gap-1 text-xs text-social-muted">
            <span>Just now</span>
            <span aria-hidden>·</span>
            <Globe className="size-3" aria-hidden />
          </p>
        </div>
        <MoreHorizontal className="ml-auto size-5 shrink-0 text-social-muted" aria-hidden />
      </header>

      {caption ? (
        <p className="whitespace-pre-wrap px-4 pb-3 text-[0.9375rem] leading-[1.45]">
          {caption}
        </p>
      ) : null}

      {media}

      <GlyphRow
        items={[
          { icon: ThumbsUp, label: "Like" },
          { icon: MessageCircle, label: "Comment" },
          { icon: Share, label: "Share" },
        ]}
        className="mx-4 border-t border-social-border py-1.5 text-social-muted"
        itemClassName="flex-1 py-1.5"
      />
    </CardShell>
  );
}
