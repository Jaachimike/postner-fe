import type { components } from "@/lib/api/schema";

export type PostFormat = NonNullable<components["schemas"]["BrandOut"]["formats"]>[number];

export const POST_FORMATS = [
  "ig_feed",
  "ig_portrait",
  "ig_story",
  "tiktok",
  "fb_post",
  "x_post",
] as const satisfies readonly PostFormat[];

export const PLATFORMS = ["instagram", "facebook", "x", "tiktok"] as const;

/** The social network a format publishes to. Drives which chrome the review card wears. */
export type Platform = (typeof PLATFORMS)[number];

/**
 * How the chrome relates to the media.
 *
 * `card` — chrome frames the media (a feed post).
 * `immersive` — chrome overlays full-bleed 9:16 media (a story / TikTok).
 */
export type ChromeSurface = "card" | "immersive";

type FormatMeta = {
  label: string;
  short: string;
  width: number;
  height: number;
  platform: Platform;
  surface: ChromeSurface;
};

export const FORMAT_META: Record<PostFormat, FormatMeta> = {
  ig_feed: {
    label: "Instagram feed",
    short: "IG feed",
    width: 1080,
    height: 1080,
    platform: "instagram",
    surface: "card",
  },
  ig_portrait: {
    label: "Instagram portrait",
    short: "IG portrait",
    width: 1080,
    height: 1350,
    platform: "instagram",
    surface: "card",
  },
  ig_story: {
    label: "Instagram story",
    short: "IG story",
    width: 1080,
    height: 1920,
    platform: "instagram",
    surface: "immersive",
  },
  tiktok: {
    label: "TikTok",
    short: "TikTok",
    width: 1080,
    height: 1920,
    platform: "tiktok",
    surface: "immersive",
  },
  fb_post: {
    label: "Facebook",
    short: "Facebook",
    width: 1080,
    height: 1080,
    platform: "facebook",
    surface: "card",
  },
  x_post: {
    label: "X / Twitter",
    short: "X",
    width: 1600,
    height: 900,
    platform: "x",
    surface: "card",
  },
};

export function formatLabel(format: string): string {
  return FORMAT_META[format as PostFormat]?.label ?? format;
}

export function formatDimensions(format: string): string {
  const meta = FORMAT_META[format as PostFormat];
  return meta ? `${meta.width}×${meta.height}` : "";
}

export function aspectRatio(format: string): number {
  const meta = FORMAT_META[format as PostFormat];
  return meta ? meta.width / meta.height : 1;
}

export function isPostFormat(value: string): value is PostFormat {
  return (POST_FORMATS as readonly string[]).includes(value);
}

/**
 * The platform a format belongs to, or null for an id the app does not know.
 *
 * Null is meaningful: the review card falls back to neutral Postner chrome
 * rather than guessing, because guessing wrong shows the draft in a frame it
 * will never appear in — the exact failure this mapping exists to prevent.
 */
export function platformOf(format: string): Platform | null {
  return FORMAT_META[format as PostFormat]?.platform ?? null;
}

/** Full-bleed 9:16 formats, whose chrome overlays the media instead of framing it. */
export function isImmersive(format: string): boolean {
  return FORMAT_META[format as PostFormat]?.surface === "immersive";
}
