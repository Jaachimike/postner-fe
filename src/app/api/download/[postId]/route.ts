import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";
import { readSessionToken } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Context = { params: Promise<{ postId: string }> };

/**
 * Streams the API's approved download (PNG or zip). The JSON proxy cannot
 * forward this: it rejects non-JSON responses.
 */
export async function GET(request: Request, context: Context) {
  const { postId } = await context.params;
  const token = await readSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get("format");
  const search = format ? `?format=${encodeURIComponent(format)}` : "";
  const upstream = await fetch(
    `${API_BASE_URL}/posts/${encodeURIComponent(postId)}/download${search}`,
    {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok) {
    let body: unknown = { detail: "Download failed" };
    try {
      body = await upstream.json();
    } catch {
      // Keep the fallback.
    }
    return NextResponse.json(body, { status: upstream.status });
  }

  if (!upstream.body) {
    return NextResponse.json({ detail: "Asset unavailable" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": contentType || "application/octet-stream",
      "content-disposition":
        upstream.headers.get("content-disposition") ?? "attachment",
      "cache-control": "no-store",
    },
  });
}
