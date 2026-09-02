"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Renders API-supplied post markup inside a locked-down iframe.
 *
 * SECURITY — read before changing anything here.
 *
 * The markup is assembled by the API with unescaped string substitution, from
 * LLM output derived from a scraped third-party page. Treat every byte of it
 * as attacker-controlled.
 *
 * `sandbox=""` (empty, not omitted) is what makes that safe: it denies scripts,
 * same-origin access, forms, popups and top-level navigation, while still
 * allowing the stylesheets and data: images the designs need. Never add
 * `allow-scripts` together with `allow-same-origin` — that pair lets the frame
 * reach out and strip its own sandbox attribute. And never swap this for
 * `dangerouslySetInnerHTML`, which would execute the payload on our origin,
 * where the session cookie and the credentialed `/api/proxy` live.
 *
 * The frame is also `pointer-events: none`: the preview is a picture, not a
 * surface anyone can interact with, which rules out click-through and UI-redress
 * games from inside the frame.
 */

/** Refuse to mount anything larger than this; a huge document hangs the tab. */
const MAX_PREVIEW_BYTES = 8_000_000;

export function HtmlPreview({
  html,
  width,
  height,
  title,
  className,
  active = true,
}: {
  html: string;
  width: number;
  height: number;
  title: string;
  className?: string;
  /** Mount the frame. Keep false for off-screen slides in a carousel. */
  active?: boolean;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0);

  // The designs are fixed-pixel canvases (1080×1350 and friends), so the frame
  // renders at its natural size and gets scaled down to whatever width the card
  // happens to have. Measuring beats a CSS-only approach because the frame's
  // content size is opaque to us across the sandbox boundary.
  React.useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? 0;
      setScale(measured > 0 ? measured / width : 0);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [width]);

  const tooLarge = html.length > MAX_PREVIEW_BYTES;

  return (
    <div
      ref={hostRef}
      className={cn("relative w-full overflow-hidden", className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {tooLarge ? (
        <PreviewNote
          title="Preview too large"
          body="This design came back bigger than the render cap. Download it instead."
        />
      ) : active && scale > 0 ? (
        <iframe
          title={title}
          srcDoc={html}
          sandbox=""
          referrerPolicy="no-referrer"
          loading="lazy"
          // An iframe is focusable by default, so without this every mounted
          // slide is a tab stop that lands the user inside an empty sandboxed
          // document. There is nothing to reach in there: `sandbox=""` already
          // makes the content inert.
          tabIndex={-1}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            border: 0,
            display: "block",
            pointerEvents: "none",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Why this inherits `currentColor` instead of naming a token: the note appears
 * on the dark review card, on the light download sheet, and on the black
 * letterbox behind a preview. Any fixed pair is invisible on one of them.
 */
export function PreviewNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 px-6 text-center">
      <ImageOff className="size-6 opacity-60" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-xs leading-relaxed opacity-70">{body}</p>
    </div>
  );
}
