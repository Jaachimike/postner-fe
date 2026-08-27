import type { components } from "@/lib/api/schema";
import type { PostFormat } from "@/lib/formats";

type S = components["schemas"];

export type Brand = S["BrandOut"];
export type CreateBrandBody = S["CreateBrandBody"];
export type PatchBrandBody = S["PatchBrandBody"];
export type Pack = S["PackSummary"];
export type Variant = S["VariantOut"];
export type Revision = S["RevisionItem"];
export type TokenResponse = S["TokenResponse"];
export type Me = S["MeResponse"];

/**
 * The OpenAPI schema types `content` / `images` / `composed` as open dicts
 * (FastAPI `dict[str, Any]`). These interfaces mirror what the backend
 * actually writes in `app/posts/service.py` — keep them in sync if the
 * service changes shape.
 */
export interface CarouselSlide {
  page_id: string;
  title?: string;
  subtitle?: string;
  body?: string;
  body_2?: string;
  body_emphasis?: string;
  page_number?: string;
  cta?: string;
  brand?: string;
  series?: string;
  script?: string;
  next?: string;
  handle?: string;
  visual_prompt?: string;
}

export interface PostContent {
  mode?: "pack" | "single";
  post_type?: string;
  page_type?: string;
  brand?: string;
  ig_fb_caption?: string;
  tiktok_script?: string;
  visual_prompt?: string;
  overlay_text?: string;
  source_title?: string;
  logo_url?: string | null;
  tagline?: string;
  slides?: CarouselSlide[];
  pack_page_ids?: string[];
  pack_images_needed?: number;
}

export interface ComposedPage {
  index: number;
  page_id: string;
  /** Absolute path inside the API container. Not browser-addressable. */
  path: string;
  html?: string;
  /** Present once uploaded to object storage (STORAGE_BACKEND=s3). */
  url?: string;
  key?: string;
}

export interface ComposedPayload {
  pages?: ComposedPage[];
  page_paths?: string[];
  final_path?: string | null;
  videos?: Record<string, string>;
}

/** Post lifecycle, in the order the API moves through it. */
export type PostStatus =
  | "drafted"
  | "imaged"
  | "composed"
  | "animated"
  | "approved"
  | "rejected";

export type Post = Omit<S["PostResponse"], "content" | "composed" | "images" | "format"> & {
  format: PostFormat;
  status: PostStatus;
  content: PostContent;
  composed: ComposedPayload;
  images: Record<string, unknown>;
};

export type FeedbackDecision = "approved" | "rejected" | "needs_changes";

export const REJECT_REASONS = [
  { value: "off_brand", label: "Off brand" },
  { value: "weak_hook", label: "Weak hook" },
  { value: "bad_visual", label: "Bad visual" },
  { value: "wrong_tone", label: "Wrong tone" },
  { value: "inaccurate", label: "Inaccurate" },
] as const;

/** Statuses that mean the post still belongs in the review queue. */
export const REVIEWABLE_STATUSES: PostStatus[] = [
  "drafted",
  "imaged",
  "composed",
  "animated",
];

export function isReviewable(post: Post): boolean {
  return REVIEWABLE_STATUSES.includes(post.status);
}

export function composedPages(post: Post): ComposedPage[] {
  return [...(post.composed?.pages ?? [])].sort((a, b) => a.index - b.index);
}

export function isPack(post: Post): boolean {
  return post.content?.mode === "pack";
}

/**
 * Composed pages carry a browser-usable `url` only when the API runs with
 * STORAGE_BACKEND=s3. With the default `local` backend the API returns a
 * container-local filesystem path and there is no route serving it, so the
 * preview cannot be rendered. Callers must handle `null`.
 */
export function pageImageUrl(page: ComposedPage): string | null {
  const url = page.url;
  if (url && /^https?:\/\//i.test(url)) return url;
  return null;
}

export function postHandle(brandName: string | undefined): string {
  if (!brandName) return "@brand";
  return "@" + brandName.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
