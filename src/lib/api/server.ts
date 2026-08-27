import "server-only";

import { API_BASE_URL } from "@/lib/env";
import { ApiError, apiErrorMessage } from "@/lib/api/errors";
import { readSessionToken } from "@/lib/auth/session";

/**
 * Server-side call to the FastAPI backend with the session JWT attached.
 * Used by server components and the auth route handlers.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = init;
  const bearer = token === undefined ? await readSessionToken() : token;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      ...headers,
    },
  });

  let body: unknown;
  const text = await response.text();
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new ApiError(
      apiErrorMessage(body, `Request failed (${response.status})`),
      response.status,
      body,
    );
  }
  return body as T;
}
