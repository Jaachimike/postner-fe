import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";
import { readSessionToken } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Compose runs Playwright on the API side and can take a while; give the
 * proxy plenty of headroom rather than failing a render that succeeded.
 */
export const maxDuration = 300;

/** Routes that must never be reachable through the browser proxy. */
const BLOCKED = [/^auth\/(login|register)$/];

type Context = { params: Promise<{ path: string[] }> };

async function forward(request: Request, context: Context) {
  const { path } = await context.params;
  const target = path.join("/");

  if (BLOCKED.some((pattern) => pattern.test(target))) {
    return NextResponse.json(
      { detail: "Use /api/auth/* for credential exchange." },
      { status: 404 },
    );
  }

  const token = await readSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const search = new URL(request.url).search;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const upstream = await fetch(`${API_BASE_URL}/${target}${search}`, {
    method: request.method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(hasBody ? { "content-type": "application/json" } : {}),
    },
    body: hasBody ? await request.text() : undefined,
    cache: "no-store",
  });

  const payload = await upstream.text();
  const upstreamType = upstream.headers.get("content-type") ?? "";

  // The API has endpoints that return post markup as text/html (for example
  // /posts/{id}/pages/{id}/html). That markup is assembled from LLM output
  // derived from scraped pages, and forwarding it verbatim would serve
  // attacker-influenced HTML from *our* origin — the one holding the session
  // cookie and this credentialed proxy. Preview HTML reaches the client as a
  // JSON string field instead, and gets rendered in a sandboxed iframe.
  if (payload && upstreamType && !/^application\/(json|problem\+json)/i.test(upstreamType)) {
    return NextResponse.json(
      { detail: `Blocked a non-JSON API response (${upstreamType}).` },
      { status: 502 },
    );
  }

  return new NextResponse(payload || null, {
    status: upstream.status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
