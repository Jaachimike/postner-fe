import { cn } from "@/lib/utils/cn";

/**
 * A design centred inside the format's frame.
 *
 * The frame wins. Every pack page hardcodes 1080×1350 in its own CSS whatever
 * the post's format is (see `pageDimensions` in `lib/api/types.ts`), so for a
 * 9:16 story or a 16:9 X post the design's aspect will not match the frame it
 * publishes into. Letterboxing shows that honestly — the alternative, sizing
 * the frame to the design, hides the crop the platform is going to apply.
 *
 * No measurement is needed. Both aspects are known at render time, so the
 * binding dimension is decidable: the design fills the width unless it is the
 * taller of the two, in which case its width shrinks by the ratio of the
 * aspects and the height follows. `HtmlPreview` is `w-full` and sets its own
 * aspect ratio, so its ResizeObserver still measures a definite box.
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
    <div
      className={cn("relative w-full overflow-hidden", className)}
      style={{ aspectRatio: frameAspect }}
    >
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
