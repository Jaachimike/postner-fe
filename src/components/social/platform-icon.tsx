import { cn } from "@/lib/utils/cn";
import type { Platform } from "@/lib/api/types";

/**
 * Instagram and Facebook marks.
 *
 * Drawn here rather than imported: lucide-react v1 removed its brand icons, and
 * the app's other platform cues are CSS tokens (`--color-ig-*`, `--color-fb-*`)
 * rather than glyphs. Stroked in `currentColor` at lucide's weight so they sit
 * beside the rest of the icon set without looking pasted in — the colour comes
 * from the row, never from a hex here.
 */
const SHARED = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function InstagramMark({ className }: { className?: string }) {
  return (
    <svg {...SHARED} className={cn("size-4", className)} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.1" cy="6.9" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookMark({ className }: { className?: string }) {
  return (
    <svg {...SHARED} className={cn("size-4", className)} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.4 8.2h-1.1a1.9 1.9 0 0 0-1.9 1.9V21" />
      <path d="M9.6 13.1h4.8" />
    </svg>
  );
}

export function PlatformIcon({
  platform,
  className,
}: {
  platform: Platform;
  className?: string;
}) {
  return platform === "facebook" ? (
    <FacebookMark className={className} />
  ) : (
    <InstagramMark className={className} />
  );
}
