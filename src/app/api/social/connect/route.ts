import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";
import { apiErrorMessage } from "@/lib/api/errors";
import { readSessionToken } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Start the Meta OAuth dance.
 *
 * This exists because the API's `GET /brands/{id}/connect/meta` needs two
 * things that cannot be true at once from the browser: a `Authorization: Bearer`
 * header, and a *top-level navigation* — a fetch cannot hand the user to
 * Facebook's consent screen, and a top-level GET cannot carry a header. The JWT
 * is an httpOnly cookie on this origin, so nothing client-side can bridge it.
 *
 * So the browser navigates here, this attaches the token server-side, and the
 * 302 the API answers with is passed back out to the browser.
 *
 * It cannot go through `/api/proxy`: that route follows redirects, so it would
 * fetch Facebook's HTML itself and then trip its own JSON-only guard with a 502.
 */
const PLATFORMS = new Set(["instagram", "facebook"]);

/** Where Meta's consent screen lives. Anything else is not a destination. */
const META_AUTH_PREFIXES = [
  "https://www.facebook.com/",
  "https://facebook.com/",
  "https://m.facebook.com/",
];

function backToConnections(
  request: Request,
  brandId: string,
  error: string,
): NextResponse {
  const target = new URL(
    brandId ? `/brands/${encodeURIComponent(brandId)}/connections` : "/brands",
    request.url,
  );
  target.searchParams.set("oauth", "meta");
  target.searchParams.set("error", error);
  return NextResponse.redirect(target, 302);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId") ?? "";
  const platform = searchParams.get("platform") ?? "";

  if (!brandId) {
    return NextResponse.redirect(new URL("/brands", request.url), 302);
  }
  if (!PLATFORMS.has(platform)) {
    return backToConnections(request, brandId, `Unsupported platform "${platform}".`);
  }

  const token = await readSessionToken();
  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `/brands/${brandId}/connections`);
    return NextResponse.redirect(login, 302);
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${API_BASE_URL}/brands/${encodeURIComponent(brandId)}/connect/meta` +
        `?platform=${encodeURIComponent(platform)}`,
      {
        headers: { authorization: `Bearer ${token}` },
        // Do not follow it — the whole point is to hand the Location to the browser.
        redirect: "manual",
        cache: "no-store",
      },
    );
  } catch {
    return backToConnections(request, brandId, "Could not reach the API.");
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get("location") ?? "";
    if (!META_AUTH_PREFIXES.some((prefix) => location.startsWith(prefix))) {
      // The API is the only caller, but it is still an upstream telling us where
      // to send a logged-in user's browser. Pin it to Meta rather than trusting it.
      return backToConnections(
        request,
        brandId,
        "The API returned an unexpected sign-in URL.",
      );
    }
    return NextResponse.redirect(location, 302);
  }

  let body: unknown;
  try {
    body = await upstream.json();
  } catch {
    body = undefined;
  }
  return backToConnections(
    request,
    brandId,
    apiErrorMessage(body, `Could not start the connection (${upstream.status}).`),
  );
}
