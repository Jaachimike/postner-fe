import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/env";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // mirrors the API's default JWT_EXPIRE_MINUTES

/** Next 16: `cookies()` is async — synchronous access was removed. */
export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function writeSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
