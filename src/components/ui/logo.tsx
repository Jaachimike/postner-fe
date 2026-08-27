import { cn } from "@/lib/utils/cn";

/**
 * Postner wordmark: `<postner/>` with accent-green chevrons, per the review
 * screen reference. Text-based so it stays crisp at any size and inherits
 * currentColor for use on both light chrome and the dark post card.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-center font-semibold tracking-tight",
        className,
      )}
      aria-label="Postner"
      role="img"
    >
      <span aria-hidden className="text-accent">&lt;</span>
      <span aria-hidden>postner</span>
      <span aria-hidden className="text-accent">/&gt;</span>
    </span>
  );
}
