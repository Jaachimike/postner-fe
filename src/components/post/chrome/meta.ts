import type { PagerVariant } from "@/components/post/post-carousel";
import { platformOf, type Platform } from "@/lib/formats";

/**
 * The parts of a platform's look that the *carousel* needs, not the chrome.
 *
 * The frame's surface and the pager's placement are platform decisions, but the
 * carousel is what renders them — it owns the frame so the aspect ratio stays
 * stable across slides. So they are resolved here, from the format, and handed
 * down. Everything else about a platform lives in its own chrome component.
 */
export interface ChromeMedia {
  variant: PagerVariant;
  /** Passed to `PostCarousel` as `frameClassName`. */
  frameClassName: string;
}

const MEDIA: Record<Platform, ChromeMedia> = {
  // X frames a quoted image rather than presenting it: inset and bordered.
  x: { variant: "dots", frameClassName: "rounded-2xl border border-x-border bg-x-elevated" },
  instagram: { variant: "dots", frameClassName: "bg-black" },
  facebook: { variant: "dots", frameClassName: "bg-black" },
  // Bars rather than a right-hand rail: TikTok's own action rail already owns
  // that edge, and so does the next arrow.
  tiktok: { variant: "bars", frameClassName: "bg-black" },
};

/** Story chrome overlays its pager as segmented bars, unlike the IG feed. */
const IG_STORY_MEDIA: ChromeMedia = { variant: "bars", frameClassName: "bg-black" };

const FALLBACK: ChromeMedia = { variant: "dots", frameClassName: "rounded-xl bg-card-elevated" };

export function chromeMedia(format: string): ChromeMedia {
  if (format === "ig_story") return IG_STORY_MEDIA;
  const platform = platformOf(format);
  return platform ? MEDIA[platform] : FALLBACK;
}
