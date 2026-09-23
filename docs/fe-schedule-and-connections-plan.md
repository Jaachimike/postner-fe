# Implementation plan: social connections + scheduling

Plan for the brief in [fe-schedule-and-connections.md](./fe-schedule-and-connections.md).
Written against the code as it stands today, not the brief's assumptions — where
the two differ, this file says so.

---

## What already landed

- **`npm run gen:api` is already done.** `src/lib/api/schema.d.ts` carries every
  route in the brief: `/brands/{brand_id}/connect/meta`, `.../oauth/meta/pages`,
  `.../connections`, `.../posting-schedule`, `.../posting-schedule/reset`,
  `.../next-slot`, and all five `/scheduled-posts` routes, plus the
  `ConnectionOut` / `PostingScheduleOut` / `ScheduledPostOut` / `NextSlotOut` /
  `MetaPageOut` / `SchedulePostIn` / `ScheduleSlotIn` schemas.
  Re-run it only if the backend changed since. Checklist item 1 is a verify, not a build.

## Two things the brief did not know

1. **The OAuth start cannot be a plain `window.location` to the API.**
   `start_meta_oauth` in `backend/app/social/routes_oauth.py` depends on
   `get_current_auth` and answers with a 302 to Meta. Our JWT is an httpOnly
   cookie on the *Next* origin, so a top-level GET to the API host carries no
   credentials, and the generic `/api/proxy` is no good either: it follows
   redirects server-side and would fetch Meta's HTML, which its non-JSON guard
   then turns into a 502. So the BFF route the brief calls "recommended" is
   **required**. See step 3.

2. **The backend's early-error callback path points at a route we do not have.**
   `meta_oauth_callback` redirects to `{FRONTEND_PUBLIC_URL}/channels?oauth=meta&error=…`
   for `error`, missing `code`/`state`, and bad state — only the later failures
   use `/brands/{id}/connections`. `/channels` does not exist in this app, so
   those three cases land on a 404 with the reason in the query string. Fix:
   add `src/app/(app)/channels/page.tsx` as a thin redirector that reads
   `?error=` and forwards to `/brands` with the message. (Cleaner alternative is
   a one-line backend change to `/brands?oauth=meta&error=…`; do the FE shim
   regardless so the flow never 404s.)

---

## Step 1 — Domain types

`src/lib/api/types.ts` (append; follows the file's existing "narrow the open
dicts" pattern — `PostingScheduleOut.slots` and `NextSlotOut.slot` are typed
`{[key: string]: unknown}` by the generator, and `platform` / `status` come back
as bare `string`).

```ts
export type Platform = "instagram" | "facebook";        // v1: Meta only
export type ConnectionStatus = "active" | "revoked" | "expired";
export type ScheduledStatus = "pending" | "processing" | "published" | "failed" | "canceled";

export type Connection = Omit<S["ConnectionOut"], "platform" | "status"> & {
  platform: Platform;
  status: ConnectionStatus;
};
export type MetaPage = S["MetaPageOut"];
export type ScheduleSlot = S["ScheduleSlotIn"];          // { time, days }
export type PostingSchedule = Omit<S["PostingScheduleOut"], "slots"> & { slots: ScheduleSlot[] };
export type NextSlot = Omit<S["NextSlotOut"], "slot"> & { slot: ScheduleSlot };
export type ScheduledPost = Omit<S["ScheduledPostOut"], "platform" | "status"> & {
  platform: Platform;
  status: ScheduledStatus;
};
```

Helpers in the same file:

- `DAY_LABELS = ["M","T","W","T","F","S","S"]` with `0=Monday … 6=Sunday` (ISO, per the brief).
- `postsPerWeek(slots)` — sum of `days.length`, for the live summary before save.
- `isActiveConnection(c)` — `c.status === "active"`.
- `canSchedule(post)` — `isApproved(post) && downloadablePages(post).length > 0`
  (mirrors the API's "must have composed image URLs" rule using the existing helper).
- `scheduledForPost(rows, postId)` — pick the newest non-canceled row.

## Step 2 — Query keys

`src/lib/query-keys.ts`:

```ts
connections: (brandId: string) => ["brands", brandId, "connections"] as const,
postingSchedule: (brandId: string, connectionId: string) =>
  ["brands", brandId, "connections", connectionId, "posting-schedule"] as const,
nextSlot: (brandId: string, connectionId: string) =>
  ["brands", brandId, "connections", connectionId, "next-slot"] as const,
metaPages: (brandId: string, nonce: string) =>
  ["brands", brandId, "oauth-pages", nonce] as const,
scheduledPosts: (brandId?: string) =>
  brandId ? (["scheduled-posts", brandId] as const) : (["scheduled-posts"] as const),
```

## Step 3 — BFF route for the OAuth start

New: `src/app/api/social/connect/route.ts` (nodejs runtime, `force-dynamic`).

- Read `brandId` + `platform` from the query; 400 on a missing/unknown value
  (`platform` must be `instagram` or `facebook`).
- `readSessionToken()`; redirect to `/login` if absent.
- Fetch `${API_BASE_URL}/brands/${brandId}/connect/meta?platform=…` with an
  `authorization: Bearer` header, `redirect: "manual"`, `cache: "no-store"`.
  **`redirect: "manual"` is the whole point** — without it we follow the 302 and
  fetch Meta's login page ourselves.
- On 3xx: read the `location` header, assert it starts with
  `https://www.facebook.com/` (never bounce the browser to an arbitrary
  upstream-supplied URL), then `NextResponse.redirect(location, 302)`.
- On anything else (notably the 503 when Meta env vars are unset, and 404 for a
  brand outside the tenant): redirect back to
  `/brands/{brandId}/connections?oauth=meta&error=<detail>` so the failure shows
  up in the same place as a Meta-side failure rather than as a raw JSON page.

Not added to `/api/proxy` — that route is deliberately JSON-only.

## Step 4 — Hooks

New: `src/features/social/hooks.ts` (`"use client"`, same `api` + `unwrap`
shape as `src/features/brands/hooks.ts`).

| Hook | Call | Invalidates |
|------|------|-------------|
| `useConnections(brandId)` | `GET /brands/{brand_id}/connections` → `.connections` | — |
| `useMetaPages(brandId, nonce)` | `GET …/oauth/meta/pages?nonce=` → `.pages`; `enabled: Boolean(nonce)`, `retry: false`, `staleTime: Infinity` (the nonce is single-use, a retry storm burns it) | — |
| `useCompleteConnection(brandId)` | `POST …/connections` | connections |
| `useDisconnect(brandId)` | `DELETE …/connections/{id}` | connections |
| `usePostingSchedule(brandId, connectionId)` | `GET …/posting-schedule` | — |
| `useSavePostingSchedule(…)` | `PUT …/posting-schedule` | that schedule + its next-slot |
| `useResetPostingSchedule(…)` | `POST …/posting-schedule/reset` | same |
| `useNextSlot(brandId, connectionId)` | `GET …/next-slot` | — (`staleTime: 0`; a stale "next slot" is a past datetime the API will reject) |
| `useScheduledPosts(brandId)` | `GET /scheduled-posts?brand_id=` → `.scheduled` | — |
| `useSchedulePost()` | `POST /scheduled-posts` | scheduled-posts |
| `useReschedule(id)` / `useCancelScheduled(id)` | `PATCH` / `DELETE /scheduled-posts/{id}` | scheduled-posts |

One thing to check while wiring `useDisconnect`: the API answers 204 with no
body and the proxy forwards it with `content-type: application/json`. If
openapi-fetch chokes parsing an empty body there, drop to a bare `fetch` in that
one mutation rather than loosening the proxy.

## Step 5 — Date and timezone helpers

`src/lib/utils/date.ts` (extend):

- `TIMEZONES` from `Intl.supportedValuesOf("timeZone")` with a `UTC` fallback —
  no hand-maintained list.
- `toLocalInputValue(iso, tz)` → `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">`
  rendered in the connection's timezone, via `Intl.DateTimeFormat` parts.
- `fromLocalInputValue(value, tz)` → UTC ISO for the POST body.
- `formatInZone(iso, tz)` for display strings ("Tue 23 Sep, 13:30").

These two conversions are the only fiddly part of the feature. Keep them pure
and put the day/slot maths beside them, so the sheets stay declarative.

## Step 6 — Components

`src/components/social/`:

1. **`connections-panel.tsx`** — per-brand list. Row = platform icon +
   `display_name` + status pill; actions **Posting schedule**, **Disconnect**
   (confirm inline). Header buttons **Connect Instagram** / **Connect Facebook**
   are plain `<a href="/api/social/connect?brandId=…&platform=…">` styled as
   `Button asChild` — a full page navigation, not fetch. Empty state explains
   what connecting unlocks. Non-`active` rows show "Reconnect" in place of
   Posting schedule.

2. **`page-picker-sheet.tsx`** — opens when `?oauth=meta&nonce=` is present.
   Lists `useMetaPages`; for `platform=instagram` disable rows with no
   `instagram_business_account_id` and say why (the API rejects them too).
   Select → `useCompleteConnection` → close, strip the query params with
   `router.replace`, offer "Set posting schedule" on the new connection.

3. **`posting-schedule-sheet.tsx`** — title **Posting schedule**, helper copy from
   the brief. Timezone `Select`. One row per slot: `<input type="time">` + seven
   day toggles reusing `Chip` (min 36px tap target). Live
   `N posts / week` from `postsPerWeek(slots)`. **+ Add time**,
   **Reset to defaults** (→ reset mutation, then refetch). Footer: **Cancel**
   (`variant="secondary"`) + **Save schedule** (primary). Client validation
   before save: `HH:MM` 24h, ≥1 day per row, ≥1 row, no duplicate times.
   Local form state seeded from the query via a `key={schedule.updated_at}`
   remount — not a `setState` effect, which the compiler lint rejects.

4. **`schedule-post-sheet.tsx`** — title **Schedule Post**, subcopy
   "Times shown in your timezone — {tz}". Connection picker (checkboxes, multi);
   when the brand has one connection it is preselected and shown as context text.
   Seed the datetime from `useNextSlot` on the first selected connection; the
   user can override. One combined `<input type="datetime-local">`. Footer:
   **Cancel** + **Schedule** (primary, calendar icon). On submit: one
   `POST /scheduled-posts` per selected connection, `Promise.allSettled`, and
   report partial failure per account rather than failing the whole sheet.
   Guard: disable with a reason when the post is not approved, has no image
   URLs, the datetime is in the past, or nothing is selected.

5. **`scheduled-badge.tsx`** — small status pill (Scheduled · Published ·
   Failed · Canceled) with the local time, for the approved tile and detail.

## Step 7 — Wiring

- **`src/app/(app)/brands/page.tsx`** — add a "Connections" affordance per brand
  card linking to `/brands/{id}/connections`. Keep the card itself lean.
- **New `src/app/(app)/brands/[id]/connections/page.tsx`** — the OAuth return
  target the backend already redirects to. Reads `searchParams` for `oauth`,
  `nonce`, `platform`, `error`. Renders `PageHeader` + `ConnectionsPanel`;
  mounts `PagePickerSheet` when `nonce` is present; shows an `ErrorNote` when
  `error` is present, then clears the query.
- **New `src/app/(app)/channels/page.tsx`** — the shim from the note above:
  redirect to `/brands` carrying `?oauth=meta&error=…`.
- **`src/components/post/post-tile.tsx`** — for approved posts add a **Schedule**
  action beside download, and render `ScheduledBadge` when a row exists.
- **`src/app/(app)/approved/page.tsx`** — one `useScheduledPosts()` for the page,
  map rows onto tiles by `post_id`. One query, not one per tile.
- **`src/app/(app)/posts/[id]/page.tsx`** — same Schedule action on the detail
  view, next to the existing approved download bar.
- Nav is unchanged, per the brief.

## Step 8 — Validation and empty states

- Schedule disabled with a reason when: post not approved, no rendered pages, or
  the brand has no active connection (CTA → that brand's connections page).
- `scheduled_at` must be in the future — validate client-side against `Date.now()`
  so the API's 400 is the backstop, not the first feedback.
- Expired / revoked connection → "Reconnect" rather than a dead Posting schedule button.
- OAuth `error` query → `ErrorNote` at the top of the connections page with the
  detail, and the Connect buttons still available.
- Every sheet surfaces `toMessage(error)` through `ErrorNote`, as the review sheets do.

## Step 9 — Out of scope (restated from the brief so it does not creep in)

X / TikTok / LinkedIn / YouTube, a month-grid calendar page, changing
`Post.status` to `scheduled` / `published`, editing Meta tokens client-side, any
worker UI.

## Step 10 — Done means

- `npm run typecheck && npm run lint && npm run build` all pass (AGENTS.md).
- Manual pass against a running backend with Meta env vars set: connect IG →
  picker → connection appears → posting schedule saves and survives a reload →
  reset restores the `10:00` / `13:30` / `18:00` defaults → schedule an approved
  post to two accounts → two rows in `GET /scheduled-posts` → badge on the tile
  → cancel one.
- Meta env vars unset is a valid smoke test too: the connect button should land
  back on the connections page with the 503 detail, not a JSON blob.

## Suggested order

1. Steps 1–2 (types, keys) and step 5 (date helpers) — no UI, unblocks everything.
2. Step 3 (BFF route) and step 4 (hooks).
3. Connections page + panel + page picker (steps 6.1, 6.2, first half of 7) —
   this is the flow with the real unknowns in it; get it working end to end
   before building the schedule sheets.
4. Posting schedule sheet.
5. Schedule Post sheet + badges on approved.
