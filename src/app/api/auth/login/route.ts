import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/server";
import { writeSessionToken } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/errors";
import type { TokenResponse } from "@/lib/api/types";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const token = await apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      token: null,
    });
    await writeSessionToken(token.access_token);
    return NextResponse.json({
      user_id: token.user_id,
      tenant_id: token.tenant_id,
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ detail: message }, { status });
  }
}
