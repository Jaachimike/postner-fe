"use client";

import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "@/lib/api/schema";
import { ApiError, apiErrorMessage } from "@/lib/api/errors";

/**
 * Browser client. Base URL is the same-origin BFF, never the API host —
 * the JWT lives in an httpOnly cookie the browser cannot read, so the proxy
 * attaches the Authorization header server-side.
 */
const raiseOnError: Middleware = {
  async onResponse({ response }) {
    if (response.ok) return response;
    let body: unknown;
    const clone = response.clone();
    try {
      body = await clone.json();
    } catch {
      body = undefined;
    }
    throw new ApiError(
      apiErrorMessage(body, `Request failed (${response.status})`),
      response.status,
      body,
    );
  },
};

export const api = createClient<paths>({ baseUrl: "/api/proxy" });
api.use(raiseOnError);

/** Unwrap an openapi-fetch result, narrowing loose dict fields to domain types. */
export function unwrap<T>(result: { data?: unknown }): T {
  return result.data as T;
}
