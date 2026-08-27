/**
 * Server-only environment. The backend base URL is deliberately NOT a
 * NEXT_PUBLIC_ var: the browser never talks to the API directly, it goes
 * through the BFF at /api/proxy (see src/app/api/proxy/[...path]/route.ts).
 * That keeps every request same-origin (the FastAPI app ships no CORS
 * middleware) and keeps the JWT in an httpOnly cookie.
 */
export const API_BASE_URL = (
  process.env.API_BASE_URL ?? "http://localhost:8001"
).replace(/\/$/, "");

export const SESSION_COOKIE = "postner_session";
