import { cn } from "@/lib/utils/cn";

/**
 * Postner wordmark: `<postner/>` with accent-green chevrons.
 *
 * `postner-wordmark.svg` is the brand artwork cropped to the lockup — the
 * source `postner-logo.svg` centres it in a 2000×2000 #f3f3f3 tile, which at
 * header size would shrink the wordmark to a few pixels. The mark carries its
 * own brand colours, so size it with a height (`h-*`) rather than `text-*`.
 */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/postner-wordmark.svg"
      alt="Postner"
      width={1957}
      height={404}
      className={cn("h-6 w-auto select-none", className)}
    />
  );
}
