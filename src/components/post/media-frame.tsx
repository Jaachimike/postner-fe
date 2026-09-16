import { cn } from "@/lib/utils/cn";

/**
 * The largest box of a given aspect that fits the space available — in width
 * *and* in height.
 *
 * This is what keeps the review card on one screen. Everything here used to be
 * width-driven: an `aspect-ratio` on a `w-full` box, so the media's height was
 * a function of the column width and the viewport's height never entered it.
 * At 34rem a 4:5 frame is ~680px tall whatever the screen does, which pushed
 * the action row and the FABs below the fold.
 *
 * Takes the available height from flexbox rather than measuring: as `flex-1`
 * inside a definite-height column it is handed exactly what the header,
 * caption, action row and FABs left over, so a long caption shrinks the design
 * instead of overflowing the page. `container-type: size` then exposes that
 * height to CSS as `cqh`.
 *
 * `min()` is doing the real work. Resolving *width* as the smaller of the full
 * width and the width implied by the full height means one dimension is always
 * the binding one and `aspect-ratio` derives the other. Setting both a height
 * and a `max-width` instead would over-constrain the box and distort the ratio.
 */
export function FitBox({
  aspect,
  minHeight = "12rem",
  className,
  children,
}: {
  /** Width / height of the box to fit. */
  aspect: number;
  /**
   * Floor below which the box stops shrinking and the page scrolls instead.
   *
   * The floor matters as much as the ceiling. Without one the design shrinks
   * without limit, and on a short laptop with a long caption it reaches ~140px
   * wide — technically on one screen, useless to review. Overflowing and
   * letting `main` scroll is the lesser failure. Lower it for a box that is
   * decorative rather than something the user has to read.
   */
  minHeight?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 [container-type:size]" style={{ minHeight }}>
      <div
        className={cn("mx-auto", className)}
        style={{
          aspectRatio: aspect,
          width: `min(100%, calc(100cqh * ${aspect}))`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * A design centred inside the format's frame.
 *
 * The frame wins. When the two aspects agree the design fills it exactly and
 * this is a no-op, which is the normal case now that the API sizes each
 * canvas from `post.format`: a story renders 9:16, an X post 16:9.
 *
 * The letterboxing is what happens when they disagree, and it is kept for the
 * case that still can. A post composed before that backend change carries a
 * 1080×1350 canvas whatever format it claims, so its design genuinely does not
 * match the frame it publishes into. Bars state that honestly; sizing the frame
 * to the design instead would hide the crop the platform is going to apply.
 * Wide bars on a new post are a signal worth chasing, not a cosmetic bug.
 *
 * No measurement is needed. Both aspects are known at render time, so the
 * binding dimension is decidable: the design fills the width unless it is the
 * taller of the two, in which case its width shrinks by the ratio of the
 * aspects and the height follows. `HtmlPreview` is `w-full` and sets its own
 * aspect ratio, so its ResizeObserver still measures a definite box.
 *
 * This fills its parent rather than sizing itself, so the parent must already
 * be the frame's shape — `FitBox` above is what establishes that. `frameAspect`
 * is still needed here, but only as the reference for the letterbox maths.
 */
export function MediaFrame({
  frameAspect,
  designAspect,
  className,
  children,
}: {
  /** Width / height of the format's canvas — `aspectRatio(post.format)`. */
  frameAspect: number;
  /** Width / height of the design. Omit to fill the frame (the note states). */
  designAspect?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative size-full overflow-hidden", className)}>
      {designAspect === undefined ? (
        // The note states fill the frame outright — they need a definite height
        // for their own `size-full`, which a width-driven box cannot give them.
        <div className="absolute inset-0">{children}</div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            style={{
              width:
                designAspect >= frameAspect
                  ? "100%"
                  : `${(designAspect / frameAspect) * 100}%`,
            }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
