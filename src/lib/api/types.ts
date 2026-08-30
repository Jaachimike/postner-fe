import type { components } from "@/lib/api/schema";
import { FORMAT_META, type PostFormat } from "@/lib/formats";

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
  /** Name the API gives the filled HTML. An identifier, not a fetchable path. */
  html?: string;
  /** Filled markup as stored for revisions/undo. Render `html_content`. */
  html_source?: string;
  /** Browser-ready markup; asset refs are object-storage URLs. Response-only. */
  html_content?: string;
  /** Intrinsic canvas size, when the API reports it. */
  width?: number;
  height?: number;
  /**
   * Public object-storage URL for the rendered PNG. Absent until `POST /render`
   * (or approve) has run — rendering uploads and then discards the local file,
   * so a page is either rendered with a `url` or not rendered at all.
   */
  url?: string;
  key?: string;
}

export interface ComposedPayload {
  pages?: ComposedPage[];
  page_paths?: string[];
  final_path?: string | null;
  videos?: Record<string, string>;
}

/**
 * Post lifecycle, in the order the API moves through it.
 *
 * `preview` (HTML filled) and `rendered` (PNGs written) replaced the single
 * `composed` step when the API split the two. `composed` is kept because rows
 * written before that split still carry it.
 */
export type PostStatus =
  | "drafted"
  | "imaged"
  | "composed"
  | "preview"
  | "rendered"
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
  "preview",
  "rendered",
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
 * The rendered PNG's public URL, or null when the page has not been rendered.
 *
 * The scheme check is belt-and-braces for rows written before the API moved to
 * object storage, which carried container filesystem paths here.
 */
export function pageImageUrl(page: ComposedPage): string | null {
  const url = page.url;
  if (url && /^https?:\/\//i.test(url)) return url;
  return null;
}

/**
 * Browser-ready markup for one page, or null.
 *
 * Only `html_content` is ever safe to render: `html_source` is the Playwright
 * copy and still points at `file://` assets that resolve to nothing in a
 * browser.
 */
export function pagePreviewHtml(page: ComposedPage): string | null {
  const html = page.html_content;
  return typeof html === "string" && html.trim().length > 0 ? html : null;
}

export function previewPages(post: Post): ComposedPage[] {
  return composedPages(post).filter((page) => pagePreviewHtml(page));
}

/**
 * The markup still points at `file://` assets.
 *
 * Posts composed before the API moved to object storage embed container-local
 * image paths. They render as text on a background with every photo missing,
 * and nothing about that failure is visible to the browser — so detect it and
 * say what to do rather than showing a design that looks broken.
 */
export function needsRecompose(post: Post): boolean {
  return previewPages(post).some((page) =>
    (page.html_content ?? "").includes("file://"),
  );
}

/** The post has HTML to review. This is the gate for entering the queue. */
export function hasPreview(post: Post): boolean {
  return previewPages(post).length > 0;
}

/**
 * Every page has a rendered PNG. Mirrors the API's own `_page_has_png`, which
 * decides whether approving triggers a render — keep the two in step, or the
 * UI will offer downloads for files the API does not think exist.
 */
export function isRendered(post: Post): boolean {
  const pages = composedPages(post);
  return pages.length > 0 && pages.every((page) => Boolean(page.url));
}

export function downloadablePages(post: Post): ComposedPage[] {
  return composedPages(post).filter((page) => pageImageUrl(page));
}

/**
 * The intrinsic canvas size to render a preview at.
 *
 * The API does not report per-page dimensions yet, and they cannot be derived
 * from `post.format`: every pack page hardcodes 1080×1350 in its own CSS
 * regardless of the post's format. So read the size out of the markup, and
 * keep the format as a last resort. Prefers `width`/`height` when the API
 * starts sending them.
 */
const CANVAS_SIZE_RE =
  /(?:#canvas|html\s*,\s*body)\s*\{[^}]*?width:\s*(\d+)px[^}]*?height:\s*(\d+)px/i;

export function pageDimensions(
  page: ComposedPage,
  format: PostFormat,
): { width: number; height: number } {
  if (page.width && page.height) {
    return { width: page.width, height: page.height };
  }
  const match = pagePreviewHtml(page)?.match(CANVAS_SIZE_RE);
  if (match) {
    return { width: Number(match[1]), height: Number(match[2]) };
  }
  const meta = FORMAT_META[format];
  return meta
    ? { width: meta.width, height: meta.height }
    : { width: 1080, height: 1350 };
}

export function postHandle(brandName: string | undefined): string {
  if (!brandName) return "@brand";
  return "@" + brandName.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
