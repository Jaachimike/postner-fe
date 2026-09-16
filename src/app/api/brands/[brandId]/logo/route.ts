import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/env";
import { readSessionToken } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ brandId: string }> };

export async function POST(request: Request, context: Context) {
  const token = await readSessionToken();
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const { brandId } = await context.params;
  const formData = await request.formData();

  const upstream = await fetch(
    `${API_BASE_URL}/brands/${encodeURIComponent(brandId)}/logo`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: formData,
      cache: "no-store",
    },
  );

  const payload = await upstream.text();
  return new NextResponse(payload || null, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}
