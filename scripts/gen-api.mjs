#!/usr/bin/env node
/**
 * Regenerate `src/lib/api/schema.d.ts` from the running API's OpenAPI document.
 *
 * This is a script rather than an inline npm command because the inline version
 * used `${API_BASE_URL:-…}` — POSIX shell syntax that npm hands to cmd.exe on
 * Windows, where it arrives at openapi-typescript as a literal string and fails.
 * Reading the env var in Node keeps the override and works on every platform.
 *
 * The API must be running and serving the code you want types for: this reads
 * whatever that process currently exposes, so generating against a stale
 * container silently commits a stale schema.
 */
import { spawnSync } from "node:child_process";

const base = (process.env.API_BASE_URL ?? "http://localhost:8001").replace(/\/+$/, "");
const source = `${base}/openapi.json`;
const out = "src/lib/api/schema.d.ts";

const probe = await fetch(source).catch(() => null);
if (!probe?.ok) {
  console.error(
    `Cannot reach ${source}.\n` +
      "Start the API first (cd ../backend && docker compose up -d), or set " +
      "API_BASE_URL to point somewhere else.",
  );
  process.exit(1);
}

const result = spawnSync("npx", ["openapi-typescript", source, "-o", out], {
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
