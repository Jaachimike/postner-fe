"use client";

import * as React from "react";
import { motion, useReducedMotion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HtmlPreview } from "@/components/ui/html-preview";
import { MediaFrame } from "@/components/post/media-frame";
import {
  findSlide,
  pageDimensions,
  pagePreviewHtml,
  slideCaption,
  type CarouselSlide,
  type ComposedPage,
} from "@/lib/api/types";
import { aspectRatio, formatLabel, type PostFormat } from "@/lib/formats";
import { cn } from "@/lib/utils/cn";

/**
 * Where the platform's chrome wants the pager.
 *
 * `dots` sits below the frame, `bars` overlays the top of it. There is no
 * right-hand rail variant: on the two formats that would want one, that edge is
 * already occupied by the platform's own action rail and by the next arrow.
 */
export type PagerVariant = "dots" | "bars";

export interface PostCarouselProps {
  /** Renderable pages, in order. Pass `previewPages(post)`. */
  pages: ComposedPage[];
  /** Per-slide copy. Joined to pages by `page_id`, never by position. */
  slides?: CarouselSlide[];
  /** Frame aspect and the accessible label. */
  format: PostFormat;
  index: number;
  onIndexChange: (index: number) => void;
  /** Neighbours kept mounted either side of `index`. */
  windowSize?: number;
  variant?: PagerVariant;
  /** Chrome hook: the frame's surface and radius. */
  frameClassName?: string;
  className?: string;
}

/** Fraction of the viewport a throw must cover to commit to the next slide. */
const COMMIT_RATIO = 0.28;
/** Weight on flick speed, so a fast short swipe still commits. */
const VELOCITY_WEIGHT = 0.15;
const SPRING = { type: "spring", stiffness: 420, damping: 42, mass: 0.9 } as const;

/**
 * The slide carousel: swipe, arrows, dots, counter, per-slide copy.
 *
 * Contract with the platform chrome that hosts this — it matters, because the
 * same component sits on a white Instagram card and on a black TikTok one:
 *
 *  1. This file names no palette token. Controls are drawn in `bg-current/...`,
 *     against two different inherited colours: anything *inside* the frame
 *     overlays the black letterbox, so the frame fixes `text-white`; anything
 *     below it (the dots, the slide's copy) sits on the card and inherits the
 *     chrome's own ink. Colouring the whole component one way puts white dots
 *     on a white Instagram card.
 *  2. The frame's surface and radius arrive as `frameClassName`. Do not wrap
 *     this in a second `overflow-hidden` with a different radius, or the
 *     overlaid arrows get clipped twice.
 *  3. The carousel owns the frame's aspect ratio. It has to: `pageDimensions`
 *     reads each design's canvas out of its own markup, so slides can disagree,
 *     and only the component that sees every slide can keep the box still.
 *
 * Slides all stay mounted and the track translates, rather than swapping one
 * slide with `AnimatePresence`. Two reasons: during a drag there would
 * otherwise be nothing behind the finger until the gesture commits, which is
 * the tell of a fake carousel; and every swap would remount an iframe, forcing
 * a fresh parse of up to 8 MB of `srcDoc`. An inactive `HtmlPreview` renders
 * only an aspect-ratio div but still measures its scale, so promoting a
 * neighbour costs nothing on the frame it appears.
 */
export function PostCarousel({
  pages,
  slides,
  format,
  index,
  onIndexChange,
  windowSize = 1,
  variant = "dots",
  frameClassName,
  className,
}: PostCarouselProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const uid = React.useId();

  const count = pages.length;
  const multi = count > 1;
  const canPrev = index > 0;
  const canNext = index < count - 1;

  const frameAspect = aspectRatio(format);
  const panelId = `${uid}-panel`;
  const tabId = (position: number) => `${uid}-tab-${position}`;

  const caption = slideCaption(findSlide(slides, pages[index]?.page_id ?? ""));

  function handleDragEnd(_event: unknown, info: PanInfo) {
    const width = viewportRef.current?.clientWidth ?? 0;
    if (!width) return;
    // Project the throw so a fast flick commits over a short distance.
    const power = info.offset.x + info.velocity.x * VELOCITY_WEIGHT;
    if (power <= -width * COMMIT_RATIO) onIndexChange(index + 1);
    else if (power >= width * COMMIT_RATIO) onIndexChange(index - 1);
    // Otherwise nothing changes and the pan layer springs back to zero.
  }

  function onArrowKeys(event: React.KeyboardEvent) {
    const targets: Record<string, number | undefined> = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: count - 1,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault(); // Home/End would otherwise scroll the page.
    onIndexChange(target);
  }

  if (count === 0) return null;

  const tabs = multi ? (
    <div
      role="tablist"
      aria-label="Slides"
      onKeyDown={onArrowKeys}
      className={cn(
        "flex items-center justify-center",
        variant === "bars" ? "w-full gap-1" : "gap-1.5",
      )}
    >
      {pages.map((page, position) => {
        const active = position === index;
        return (
          <button
            key={page.page_id}
            type="button"
            role="tab"
            id={tabId(position)}
            aria-controls={panelId}
            aria-selected={active}
            aria-label={`Slide ${position + 1} of ${count}`}
            // Roving tabindex: a ten-slide pack must not be ten tab stops, and
            // role="tab" requires it.
            tabIndex={active ? 0 : -1}
            onClick={() => onIndexChange(position)}
            className={cn(
              "rounded-full transition-all duration-200 focus-visible:outline-current",
              active ? "bg-current" : "bg-current/30",
              variant === "bars"
                ? "h-0.5 min-w-0 flex-1"
                : active
                  ? "h-1.5 w-5"
                  : "size-1.5",
            )}
          />
        );
      })}
    </div>
  ) : null;

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={`${formatLabel(format)} slides`}
      className={cn("flex flex-col gap-2", className)}
    >
      <div
        ref={viewportRef}
        role="tabpanel"
        id={panelId}
        aria-labelledby={multi ? tabId(index) : undefined}
        tabIndex={0}
        onKeyDown={onArrowKeys}
        className={cn(
          // `text-white` because everything drawn in here — arrows, counter,
          // overlaid pagers — sits over the letterbox, which is black whatever
          // the chrome around it looks like.
          "relative w-full select-none overflow-hidden text-white focus-visible:outline-current",
          frameClassName,
        )}
        style={{ aspectRatio: frameAspect }}
      >
        {/* Pan layer: tracks the finger, springs back to zero on release. */}
        <motion.div
          className="size-full touch-pan-y"
          drag={multi ? "x" : false}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragMomentum={false}
          // 1:1 tracking toward a slide that exists; a stiff rubber band toward
          // one that does not, so "there is nothing further" is felt, not read.
          dragElastic={{
            left: canNext ? 1 : 0.12,
            right: canPrev ? 1 : 0.12,
            top: 0,
            bottom: 0,
          }}
          dragTransition={{ bounceStiffness: 420, bounceDamping: 42 }}
          onDragEnd={handleDragEnd}
        >
          {/* The track is one viewport wide — flex does not grow to fit
              shrink-0 children — so -100% is exactly one slide, with no
              measurement and nothing to resync on resize. */}
          <motion.div
            className="flex size-full"
            animate={{ x: `-${index * 100}%` }}
            transition={reduceMotion ? { duration: 0 } : SPRING}
          >
            {pages.map((page, position) => {
              const html = pagePreviewHtml(page);
              const size = pageDimensions(page, format);
              return (
                <div
                  key={page.page_id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Slide ${position + 1} of ${count}`}
                  // Off-slides hold focusable iframes; inert takes them out of
                  // both the tab order and the accessibility tree at once.
                  inert={position !== index}
                  className="grid w-full shrink-0 place-items-center"
                >
                  {html ? (
                    <MediaFrame
                      frameAspect={frameAspect}
                      designAspect={size.width / size.height}
                    >
                      <HtmlPreview
                        html={html}
                        width={size.width}
                        height={size.height}
                        title={`${formatLabel(format)} preview, slide ${position + 1}`}
                        active={Math.abs(position - index) <= windowSize}
                      />
                    </MediaFrame>
                  ) : null}
                </div>
              );
            })}
          </motion.div>
        </motion.div>

        {multi ? (
          <>
            <p
              aria-live="polite"
              aria-atomic
              className="pointer-events-none absolute right-2 top-2 rounded-full bg-current/15 px-2 py-0.5 text-[0.6875rem] font-medium tabular-nums backdrop-blur-sm"
            >
              <span className="opacity-90">
                {index + 1} of {count}
              </span>
            </p>

            <CarouselArrow
              side="left"
              enabled={canPrev}
              onClick={() => onIndexChange(index - 1)}
            />
            <CarouselArrow
              side="right"
              enabled={canNext}
              onClick={() => onIndexChange(index + 1)}
            />

            {variant === "bars" ? (
              <div className="absolute inset-x-3 top-2">{tabs}</div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Below-frame furniture only exists on the framed formats. An immersive
          chrome floats its own copy over the media and has no room under it —
          anything rendered here would land beneath its absolute overlays. Those
          formats get the slide's copy through the chrome's caption instead. */}
      {variant === "dots" ? (
        <>
          {tabs}
          {caption ? (
            <p className="min-w-0 px-1 text-xs leading-snug opacity-70">
              <span className="font-medium opacity-100">{caption.title}</span>
              {caption.body ? <span className="ml-1.5">{caption.body}</span> : null}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * `aria-disabled` rather than `disabled` on purpose: the browser blurs a button
 * at the moment it becomes disabled, so arrowing to the last slide would drop a
 * keyboard user out of the card and onto the body mid-review.
 */
function CarouselArrow({
  side,
  enabled,
  onClick,
}: {
  side: "left" | "right";
  enabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous slide" : "Next slide"}
      aria-disabled={!enabled}
      onClick={() => {
        if (enabled) onClick();
      }}
      className={cn(
        "absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full",
        "bg-current/10 backdrop-blur-sm transition hover:bg-current/20",
        "focus-visible:outline-current",
        // Faded rather than removed, so the frame does not reflow and the focus
        // target stays alive at the ends.
        "aria-disabled:pointer-events-none aria-disabled:opacity-0",
        side === "left" ? "left-2" : "right-2",
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
