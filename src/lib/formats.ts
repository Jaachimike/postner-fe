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

type FormatMeta = { label: string; short: string; width: number; height: number };

export const FORMAT_META: Record<PostFormat, FormatMeta> = {
  ig_feed: { label: "Instagram feed", short: "IG feed", width: 1080, height: 1080 },
  ig_portrait: { label: "Instagram portrait", short: "IG portrait", width: 1080, height: 1350 },
  ig_story: { label: "Instagram story", short: "IG story", width: 1080, height: 1920 },
  tiktok: { label: "TikTok", short: "TikTok", width: 1080, height: 1920 },
  fb_post: { label: "Facebook", short: "Facebook", width: 1080, height: 1080 },
  x_post: { label: "X / Twitter", short: "X", width: 1600, height: 900 },
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
