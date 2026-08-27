import type { components } from "@/lib/api/schema";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Validation = components["schemas"]["HTTPValidationError"];

/** FastAPI returns `{detail: string}` or `{detail: ValidationError[]}`. Flatten both. */
export function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const detail = (body as Validation).detail as unknown;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const { loc, msg } = item as { loc?: (string | number)[]; msg?: string };
        if (!msg) return null;
        const field = loc?.filter((p) => p !== "body").join(".");
        return field ? `${field}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (messages.length) return messages.join(", ");
  }
  return fallback;
}

export function toMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
