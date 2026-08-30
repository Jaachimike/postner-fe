import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Origin serving post media, mirroring the API's STORAGE_PUBLIC_BASE_URL.
 *
 * It has to be named explicitly in the CSP rather than covered by a blanket
 * `https:`, because the local stack serves MinIO over plain http on :9000. Get
 * this wrong and images vanish from previews with no console error to explain
 * it — `srcdoc` frames have an opaque origin, so their CSP violations never
 * reach the page's own listeners.
 */
const mediaOrigin = (() => {
  const raw = process.env.STORAGE_PUBLIC_BASE_URL ?? "http://localhost:9000";
  try {
    return new URL(raw).origin;
  } catch {
    console.warn(`[next.config] STORAGE_PUBLIC_BASE_URL is not a URL: ${raw}`);
    return "";
  }
})();

/**
 * Content Security Policy.
 *
 * This exists mainly for one reason: the review screen renders API-supplied
 * post markup, which the API assembles from LLM output derived from scraped
 * third-party pages. That markup is contained in a `sandbox=""` iframe (see
 * `components/ui/html-preview.tsx`), and because `srcdoc` documents inherit the
 * embedder's policy, the directives below apply inside the frame too. They are
 * what stops a hostile design from beaconing the viewer's IP out to an
 * arbitrary host through an `<img>` or a webfont.
 *
 * Consequences for the preview, keep in sync with the designs:
 *   `img-src ${mediaOrigin}` — page photos come from object storage.
 *   `img-src https:` — brand logos are arbitrary customer-supplied URLs.
 *   fonts.googleapis / fonts.gstatic — every pack template links Google Fonts.
 *   `style-src 'unsafe-inline'` — the templates carry their own <style> blocks.
 *
 * `script-src` never needs to accommodate the frame: the sandbox blocks script
 * execution there outright. The `'unsafe-inline'` below is for Next's own
 * hydration bootstrap, and `'unsafe-eval'` is dev-only, for Turbopack's HMR.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  ["img-src 'self' data: blob: https:", mediaOrigin].filter(Boolean).join(" "),
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
