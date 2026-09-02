import { cn } from "@/lib/utils/cn";
import type { PostIdentity } from "@/components/post/chrome/types";

/**
 * The card body every chrome sits in.
 *
 * `rounded-card` is kept on all five chromes even though no real feed rounds a
 * post that much. It is the one deliberate break from fidelity: on the Postner
 * canvas the draft has to read as a single object you can accept or reject.
 *
 * `overflow-hidden` is what lets Instagram, Facebook and TikTok run their media
 * to the card's edge, so padding belongs to each chrome rather than here.
 */
export function CardShell({
  tone,
  ariaLabel,
  className,
  children,
}: {
  tone: "light" | "dark";
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article
      aria-label={ariaLabel}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-card",
        tone === "light"
          ? // A white card on the #f3f3f3 canvas is a 1.06:1 difference, so the
            // shadow alone will not separate them. The border does the work.
            "border border-social-border bg-surface text-social-ink shadow-lg shadow-ink/5"
          : "shadow-xl shadow-ink/10",
        className,
      )}
    >
      {children}
    </article>
  );
}

export function ChromeAvatar({
  identity,
  size = "md",
  ring = false,
  fallbackClassName,
}: {
  identity: PostIdentity;
  size?: "sm" | "md";
  /** Instagram's story ring. */
  ring?: boolean;
  /** Tone-appropriate background for the no-logo initial. */
  fallbackClassName?: string;
}) {
  const box = size === "sm" ? "size-8" : "size-10";

  const inner = (
    <span
      className={cn(
        "grid size-full place-items-center overflow-hidden rounded-full text-sm font-semibold",
        fallbackClassName,
      )}
    >
      {identity.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={identity.logo}
          alt=""
          draggable={false}
          className="size-full object-cover"
        />
      ) : (
        identity.initial
      )}
    </span>
  );

  if (!ring) return <span className={cn(box, "shrink-0")}>{inner}</span>;

  return (
    <span
      className={cn(
        box,
        "shrink-0 rounded-full bg-linear-to-tr from-ig-ring-start via-ig-ring-mid to-ig-ring-end p-[2px]",
      )}
    >
      <span className="grid size-full place-items-center rounded-full bg-surface p-[2px]">
        {inner}
      </span>
    </span>
  );
}

/**
 * The platform's action row.
 *
 * Decorative throughout — none of these do anything, and the review actions are
 * the FABs below the card. So the whole row is hidden from assistive tech and
 * nothing in it is a button, which matters most for Facebook, where the glyphs
 * carry visible labels and would otherwise read as three dead controls.
 */
export function GlyphRow({
  items,
  className,
  itemClassName,
}: {
  items: { icon: React.ComponentType<{ className?: string }>; label?: string }[];
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div aria-hidden className={cn("flex items-center", className)}>
      {items.map(({ icon: Icon, label }, position) => (
        <span
          key={position}
          className={cn("flex items-center justify-center gap-1.5", itemClassName)}
        >
          <Icon className="size-[1.125rem]" />
          {label ? <span className="text-sm font-medium">{label}</span> : null}
        </span>
      ))}
    </div>
  );
}
