export const IMAGE_STYLES = ["auto", "realistic", "illustration", "graphics"] as const;

export type ImageStyleChoice = (typeof IMAGE_STYLES)[number];

/** Concrete Recraft styles stored on a post. `auto` is UI-only and never persisted. */
export type ImageStyle = Exclude<ImageStyleChoice, "auto">;

type ImageStyleMeta = { label: string };

export const IMAGE_STYLE_META: Record<ImageStyleChoice, ImageStyleMeta> = {
  auto: { label: "Auto" },
  realistic: { label: "Photo" },
  illustration: { label: "Illustration" },
  graphics: { label: "Graphics" },
};

export const IMAGE_STYLE_OPTIONS = IMAGE_STYLES.map((value) => ({
  value,
  label: IMAGE_STYLE_META[value].label,
}));

export const CONCRETE_IMAGE_STYLE_OPTIONS = IMAGE_STYLES.filter(
  (value): value is ImageStyle => value !== "auto",
).map((value) => ({
  value,
  label: IMAGE_STYLE_META[value].label,
}));

export function isImageStyle(value: string): value is ImageStyle {
  return value === "realistic" || value === "illustration" || value === "graphics";
}

export function imageStyleLabel(value: string): string {
  return IMAGE_STYLE_META[value as ImageStyleChoice]?.label ?? value;
}
