import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/server";
import { readSessionToken } from "@/lib/auth/session";
import type { ComposedPage, Post } from "@/lib/api/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ postId: string; pageId: string }> };

/**
 * Streams one composed page to the browser as a file download.
 *
 * The asset URL is never taken from the request — it is read back from the
 * authoritative post record server-side, so this cannot be turned into an
 * open proxy. The viewer must also hold a session for the owning tenant,
 * since the post lookup goes through the API with their token.
 */
export async function GET(_request: Request, context: Context) {
  const { postId, pageId } = await context.params;

  const token = await readSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  let post: Post;
  try {
    post = await apiFetch<Post>(`/posts/${encodeURIComponent(postId)}`);
  } catch {
    return NextResponse.json({ detail: "Post not found" }, { status: 404 });
  }

  const page = (post.composed?.pages ?? []).find(
    (entry: ComposedPage) => entry.page_id === pageId,
  );
  if (!page) {
    return NextResponse.json({ detail: "Page not composed" }, { status: 404 });
  }

  if (!page.url || !/^https?:\/\//i.test(page.url)) {
    return NextResponse.json(
      {
        detail:
          "This page exists only on the API's local disk. Run the API with STORAGE_BACKEND=s3 to make composed assets downloadable.",
      },
      { status: 409 },
    );
  }

  const upstream = await fetch(page.url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ detail: "Asset unavailable" }, { status: 502 });
  }

  const extension = page.url.split(".").pop()?.split(/[?#]/)[0] ?? "png";
  const filename = `${post.format}-${String(page.index).padStart(2, "0")}-${page.page_id}.${extension}`;

  return new NextResponse(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/png",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
