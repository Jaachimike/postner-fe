"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { IMAGE_STYLES, type ImageStyle } from "@/lib/api/types";

/* ---------------------------------------------------------------------------
   Photo style, shown rather than named.

   "Photographic / Illustrated / Graphic" are three words that all sound like
   art direction and none of which tell you what you are about to get. A small
   picture does, and it does it before you have to read anything.

   The scenes are deliberately abstract — half a dozen shapes each. They are not
   trying to look like a generated photo, which at this size would only look
   like a bad one; they are trying to make three options that are obviously not
   each other. Every colour is a token class on the SVG root, inherited through
   `currentColor`, so no hex appears here (AGENTS.md).
--------------------------------------------------------------------------- */

function PhotographicScene() {
  return (
    <svg viewBox="0 0 64 48" className="size-full" aria-hidden>
      <defs>
        <linearGradient id="style-photo-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect width="64" height="48" fill="url(#style-photo-sky)" />
      <circle cx="45" cy="16" r="6" fill="currentColor" opacity="0.45" />
      {/* Two overlapping hills, the near one darker, so the frame reads as
          depth rather than as a flat pattern. */}
      <path d="M0 40 Q16 24 30 34 T64 30 V48 H0 Z" fill="currentColor" opacity="0.3" />
      <path d="M0 44 Q20 32 36 41 T64 38 V48 H0 Z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

function IllustratedScene() {
  return (
    <svg
      viewBox="0 0 64 48"
      className="size-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="64" height="48" fill="currentColor" opacity="0.06" stroke="none" />
      <circle cx="24" cy="19" r="7" fill="currentColor" fillOpacity="0.22" />
      <path d="M12 39 q12 -12 24 0" fill="currentColor" fillOpacity="0.22" />
      <path d="M44 38 V26 q0 -6 5 -6 t5 6 v12" fill="currentColor" fillOpacity="0.12" />
      <path d="M8 39 H58" strokeLinecap="round" />
    </svg>
  );
}

function GraphicScene() {
  return (
    <svg viewBox="0 0 64 48" className="size-full" aria-hidden>
      <rect width="64" height="48" fill="currentColor" opacity="0.06" />
      <g fill="currentColor">
        <rect x="12" y="28" width="7" height="12" opacity="0.35" />
        <rect x="23" y="21" width="7" height="19" opacity="0.5" />
        <rect x="34" y="14" width="7" height="26" opacity="0.65" />
        <rect x="45" y="8" width="7" height="32" opacity="0.85" />
      </g>
    </svg>
  );
}

const SCENES: Record<ImageStyle, () => React.ReactElement> = {
  realistic: PhotographicScene,
  illustration: IllustratedScene,
  graphics: GraphicScene,
};

/**
 * Accent for the chosen tile, ink for the rest.
 *
 * The scenes inherit this, so selecting a tile tints the picture itself rather
 * than only drawing a ring around it — which at this size is the difference
 * between spotting your choice and hunting for it.
 */
function StyleTile({
  style,
  label,
  selected,
  onSelect,
}: {
  style: ImageStyle;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const Scene = SCENES[style];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group flex flex-1 flex-col gap-1.5 rounded-xl border p-1.5 text-left",
        "transition-[background-color,border-color] duration-150",
        selected
          ? "border-ink bg-ink/3"
          : "border-border bg-surface hover:border-ink/25",
      )}
    >
      <span
        className={cn(
          "relative block overflow-hidden rounded-lg",
          selected ? "text-accent" : "text-ink-subtle group-hover:text-ink-muted",
        )}
      >
        <span className="block aspect-[4/3]">
          <Scene />
        </span>
        {selected ? (
          <span
            aria-hidden
            className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-accent text-accent-ink"
          >
            <Check className="size-2.5" strokeWidth={3.5} />
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "px-0.5 pb-0.5 text-xs font-medium",
          selected ? "text-ink" : "text-ink-muted",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function StyleTiles({
  value,
  onChange,
}: {
  value: ImageStyle;
  onChange: (next: ImageStyle) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Photo style" className="flex gap-2">
      {IMAGE_STYLES.map((style) => (
        <StyleTile
          key={style.value}
          style={style.value}
          label={style.label}
          selected={value === style.value}
          onSelect={() => onChange(style.value)}
        />
      ))}
    </div>
  );
}
