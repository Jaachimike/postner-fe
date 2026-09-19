"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";
import { Spinner } from "@/components/ui/feedback";
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
 * `sandbox="allow-same-origin"` (no `allow-scripts`) is what makes that safe:
 * it denies scripts, forms, popups and top-level navigation, while still
 * allowing the stylesheets and http(s) images the designs need, and letting
 * this component read `contentDocument` so it can wait for those images to
 * finish before revealing the frame. Never add `allow-scripts` together with
 * `allow-same-origin` — that pair lets the frame reach out and strip its own
 * sandbox attribute. And never swap this for `dangerouslySetInnerHTML`, which
 * would execute the payload on our origin, where the session cookie and the
 * credentialed `/api/proxy` live.
 *
 * The frame is also `pointer-events: none`: the preview is a picture, not a
 * surface anyone can interact with, which rules out click-through and UI-redress
 * games from inside the frame.
 */

/** Refuse to mount anything larger than this; a huge document hangs the tab. */
const MAX_PREVIEW_BYTES = 8_000_000;

/** Don't spin forever if a remote photo hangs. */
const READY_TIMEOUT_MS = 20_000;

const IMG_SRC_RE = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
const CSS_URL_RE = /url\(\s*["']?(https?:[^"')\s]+)["']?\s*\)/gi;

function extractAssetUrls(html: string): string[] {
  const urls = new Set<string>();
  for (const re of [IMG_SRC_RE, CSS_URL_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const url = match[1]?.trim();
      if (url) urls.add(url);
    }
  }
  return [...urls];
}

function preloadUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

function waitForDocumentImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  if (images.length === 0) return Promise.resolve();

  return Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  ).then(() => undefined);
}

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
  const [ready, setReady] = React.useState(false);
  const readyGen = React.useRef(0);

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

  // Fresh html / remount → hide again until the frame and its assets catch up.
  React.useEffect(() => {
    setReady(false);
    readyGen.current += 1;
  }, [html, active]);

  // Warm the browser cache for every photo the markup references so the
  // sandboxed frame paints complete on first reveal — including CSS
  // background-image urls that iframe `load` alone does not always cover.
  React.useEffect(() => {
    if (!active || !html) return;
    const urls = extractAssetUrls(html);
    if (urls.length === 0) return;
    let cancelled = false;
    void Promise.all(urls.map(preloadUrl)).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [html, active]);

  const onFrameLoad = React.useCallback(
    (event: React.SyntheticEvent<HTMLIFrameElement>) => {
      const iframe = event.currentTarget;
      const gen = readyGen.current;
      const finish = () => {
        if (gen !== readyGen.current) return;
        setReady(true);
      };

      const timer = window.setTimeout(finish, READY_TIMEOUT_MS);

      void (async () => {
        try {
          const doc = iframe.contentDocument;
          if (doc) {
            await waitForDocumentImages(doc);
            // Give the parent-side preload a beat to settle for the same urls.
            await Promise.all(extractAssetUrls(html).map(preloadUrl));
          }
        } catch {
          // Opaque document — fall through; timeout or partial paint is fine.
        } finally {
          window.clearTimeout(timer);
          finish();
        }
      })();
    },
    [html],
  );

  const tooLarge = html.length > MAX_PREVIEW_BYTES;
  const showFrame = active && scale > 0 && !tooLarge;

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
      ) : (
        <>
          {showFrame && !ready ? (
            <div
              className="absolute inset-0 z-10 grid place-items-center bg-ink/[0.04]"
              aria-busy="true"
              aria-label="Loading preview"
            >
              <Spinner className="size-5" />
            </div>
          ) : null}
          {showFrame ? (
            <iframe
              title={title}
              srcDoc={html}
              sandbox="allow-same-origin"
              referrerPolicy="no-referrer"
              loading="lazy"
              onLoad={onFrameLoad}
              // An iframe is focusable by default, so without this every mounted
              // slide is a tab stop that lands the user inside an empty sandboxed
              // document. There is nothing to reach in there: scripts stay denied.
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
                opacity: ready ? 1 : 0,
                transition: "opacity 150ms ease-out",
              }}
            />
          ) : null}
        </>
      )}
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
