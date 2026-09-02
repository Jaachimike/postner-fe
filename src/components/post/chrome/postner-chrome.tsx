import { BadgeCheck } from "lucide-react";
import { CardShell, ChromeAvatar } from "@/components/post/chrome/parts";
import type { PostChromeProps } from "@/components/post/chrome/types";
import { formatLabel } from "@/lib/formats";

/**
 * The fallback for a format this build does not recognise.
 *
 * Neutral Postner chrome, in the app's own `card-*` tokens — no platform
 * glyphs, no verified tick. Guessing a platform would put the draft in a frame
 * it will never appear in, which is the exact failure the per-format chrome
 * exists to prevent, so an unknown format gets an honest blank instead.
 */
export function PostnerChrome({ post, identity, caption, media }: PostChromeProps) {
  return (
    <CardShell
      tone="dark"
      ariaLabel={`${formatLabel(post.format)} preview for ${identity.displayName}`}
      className="gap-4 bg-card p-5 text-card-ink"
    >
      <header className="flex items-center gap-3">
        <ChromeAvatar
          identity={identity}
          fallbackClassName="bg-card-elevated text-card-muted"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[0.9375rem] font-semibold leading-tight">
            <span className="truncate">{identity.displayName}</span>
            <BadgeCheck className="size-4 shrink-0 text-accent" aria-hidden />
          </p>
          <p className="truncate text-sm text-card-muted">{identity.handle}</p>
        </div>
      </header>

      {caption ? (
        <p className="whitespace-pre-wrap text-[0.9375rem] font-medium leading-[1.55]">
          {caption}
        </p>
      ) : null}

      {media}
    </CardShell>
  );
}
