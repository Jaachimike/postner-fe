# FE brief: Social connections + scheduling

Hand this to the frontend agent. Backend for these flows **already exists** — regenerate OpenAPI after pulling BE (`npm run gen:api`).

**Primary CTA label:** always **Schedule** (never “Set Times”).

**Platforms in v1:** Instagram + Facebook only (Meta). X / TikTok later.

---

## 1. Product goals

1. Connect Instagram and Facebook accounts **per brand** (agency-friendly; tokens belong to the brand, not the user who clicked Connect).
2. Set a **weekly posting schedule** per connected account (preferred times / days).
3. From an **approved** post, pick account(s) and a datetime, then **Schedule** publish (dispatcher publishes via Meta later).
4. One-off times can default to the **next slot** from that account’s weekly schedule; user can override.

---

## 2. UI inspiration (match tone, not pixel-perfect)

### A. Posting schedule (weekly prefs)

Modal / sheet titled **Posting schedule**.

- Header: account avatar/name + platform icon; helper: “Posts auto-schedule to the next available slot. You can override per post.”
- **Timezone** dropdown (IANA, e.g. `Europe/Dublin`).
- Rows: time picker + day toggles **M T W T F S S** (active = filled, inactive = muted).
- Summary: `N posts / week` (count of active day×slot cells).
- **+ Add time**, **Reset to defaults**.
- Footer: **Cancel** (bordered) + **Save schedule** (solid primary).

### B. Schedule Post (one-off)

Modal / sheet titled **Schedule Post**.

- Subcopy: “Times shown in your timezone — **{tz}**”.
- Account context: `Instagram (@handle)` or picker if multiple connections.
- Combined date + time field (calendar + clock).
- Footer: **Cancel** + **Schedule** (primary; calendar icon OK). **Not** “Set Times”.

Reuse existing FE patterns: `Sheet`, `Button` (primary / secondary), `Field`, brands create/edit sheets.

---

## 3. Where it lives in the app

| Surface | Behavior |
|---------|----------|
| **Brands** (`/brands`) | Per-brand **Connections** section: list, Connect IG/FB, open Posting schedule, Disconnect |
| **OAuth return** | `/brands/{brandId}/connections?oauth=meta&nonce=…&platform=…` → page-picker sheet → complete connection |
| **Approved** (`/approved` + post detail) | **Schedule** action next to download → Schedule Post sheet |
| Optional later | Calendar / queue page for all `scheduled-posts` |

Nav: no new top-level item required for v1 if Connections sits under Brands and Schedule sits on Approved.

---

## 4. API contract (Bearer JWT)

Base URL via existing BFF proxy (`/api/proxy/...`). All brand-scoped routes require the brand to belong to the active tenant.

### 4.1 Connect accounts

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/brands/{brand_id}/connect/meta?platform=instagram\|facebook` | **Browser redirect** to Meta (full page or `window.location`). Needs auth cookie/token that API accepts on that GET. |
| `GET` | `/oauth/meta/callback` | Handled by **backend**; redirects to FE success URL with query params. Do not call from FE JS. |
| `GET` | `/brands/{brand_id}/oauth/meta/pages?nonce=` | List Pages (+ linked IG) for picker. |
| `POST` | `/brands/{brand_id}/connections` | Body: `{ "platform", "nonce", "page_id" }` |
| `GET` | `/brands/{brand_id}/connections` | List connections (**never** includes tokens). |
| `DELETE` | `/brands/{brand_id}/connections/{connection_id}` | Soft-revoke. |

**Connection object (response):**

```json
{
  "id": "uuid",
  "brand_id": "uuid",
  "platform": "instagram",
  "external_account_id": "…",
  "display_name": "@acmestudio",
  "page_id": "…",
  "token_expires_at": "ISO|null",
  "scopes": ["…"],
  "status": "active",
  "connected_by_user_id": "uuid|null",
  "created_at": "ISO",
  "updated_at": "ISO"
}
```

**OAuth FE return query:** `oauth=meta&nonce=…&platform=…` or `oauth=meta&error=…`.

**Page picker item:** `{ id, name, instagram_business_account_id, instagram_username }` — for `platform=instagram`, reject pages with no IG link (API also rejects).

Completing a connection **auto-creates** a default weekly posting schedule.

### 4.2 Weekly posting schedule (per connection)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/brands/{brand_id}/connections/{connection_id}/posting-schedule` | Creates **defaults** if missing |
| `PUT` | `/brands/{brand_id}/connections/{connection_id}/posting-schedule` | Replace timezone + slots |
| `POST` | `/brands/{brand_id}/connections/{connection_id}/posting-schedule/reset` | Back to server defaults |
| `GET` | `/brands/{brand_id}/connections/{connection_id}/next-slot?after=` | Next UTC datetime from schedule |

**Days:** `0=Monday … 6=Sunday` (ISO).

**Default slots (server):**

- `10:00` — Sat–Sun `[5,6]`
- `13:30` — Mon–Fri `[0,1,2,3,4]`
- `18:00` — Mon–Fri `[0,1,2,3,4]`
- Default timezone: `UTC` (user should change in UI after connect)

**GET/PUT body & response shape:**

```json
{
  "id": "uuid",
  "connection_id": "uuid",
  "brand_id": "uuid",
  "timezone": "Europe/Dublin",
  "slots": [
    { "time": "10:00", "days": [5, 6] },
    { "time": "13:30", "days": [0, 1, 2, 3, 4] }
  ],
  "posts_per_week": 12,
  "created_at": "ISO",
  "updated_at": "ISO"
}
```

**PUT body:** `{ "timezone": "Europe/Dublin", "slots": [ … ] }`  
Validate client-side: `time` = `HH:MM` 24h; each row ≥1 day; non-empty slots.

**next-slot response:**

```json
{
  "scheduled_at": "2026-09-22T12:30:00+00:00",
  "timezone": "Europe/Dublin",
  "slot": { "time": "13:30", "days": [0, 1, 2, 3, 4] },
  "connection_id": "uuid"
}
```

Use `scheduled_at` (UTC) as the Schedule Post modal default; display in the connection’s timezone.

### 4.3 One-off scheduled publishes

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/scheduled-posts` | Create |
| `GET` | `/scheduled-posts?brand_id=&status=&limit=&offset=` | List |
| `GET` | `/scheduled-posts/{id}` | Detail |
| `PATCH` | `/scheduled-posts/{id}` | Body `{ "scheduled_at" }` — only `pending` / `failed` |
| `DELETE` | `/scheduled-posts/{id}` | Cancel — not if `published` / `processing` |

**POST body:**

```json
{
  "post_id": "uuid",
  "platform": "instagram",
  "connection_id": "uuid",
  "scheduled_at": "2026-09-22T12:30:00Z"
}
```

**Rules (API enforced):**

- Post must be `status === "approved"`.
- Post must have `brand_id`; connection must be active for that brand + platform.
- Post must have composed image URLs.
- `scheduled_at` must be in the **future** (send UTC ISO).

**Statuses:** `pending` | `processing` | `published` | `failed` | `canceled`.

**Multi-platform:** one `POST /scheduled-posts` per connection (e.g. IG + FB = two rows).

---

## 5. Suggested UX flows

### Connect

1. Brands → brand → **Connect Instagram** / **Connect Facebook**.
2. Navigate to `GET …/connect/meta?platform=…` (same-origin proxy or absolute API with token — follow how other redirect-auth is done; if proxy can’t redirect Meta, open API public URL with Bearer in query is **not** supported — prefer cookie session or window to API with Authorization header via a small authenticated “start connect” that returns `{ auth_url }` if redirect-with-header is awkward).  
   **Practical approach:** FE calls a thin BFF route that 302s to Meta using the user’s JWT server-side, **or** use `window.location = `${API}/brands/.../connect/meta?platform=...`` only if the API also accepts the JWT from a short-lived connect cookie. Simplest v1: open API URL in the same window with `Authorization` impossible for top-level GET — **recommend adding FE route** `GET /api/social/connect?brandId&platform` that attaches JWT and redirects to Meta. If that BFF doesn’t exist yet, create it as part of FE work.
3. Land on `/brands/{id}/connections?oauth=meta&nonce=&platform=`.
4. `GET …/oauth/meta/pages?nonce=` → picker → `POST …/connections`.
5. Toast success; show connection; optional open Posting schedule.

### Edit weekly schedule

1. Connection row → **Posting schedule**.
2. `GET posting-schedule` → edit → `PUT`; or **Reset to defaults** → `POST …/reset`.
3. Live-update `posts_per_week` from slots (or trust API field after save).

### Schedule an approved post

1. Approved tile / detail → **Schedule**.
2. Load connections for `post.brand_id`. If empty → CTA “Connect an account” → brands.
3. User picks connection(s). For each selected: `GET next-slot` to seed datetime (or one shared time).
4. User confirms date/time → **Schedule** → `POST /scheduled-posts` per selection.
5. Show badge/status on tile: Scheduled / Published / Failed (from `GET /scheduled-posts?brand_id=` or filter by `post_id` client-side).

---

## 6. Validation & empty states

- Disable Schedule if post not approved or no image URLs.
- Empty connections: explain + link to brand connections.
- Expired connection (`status !== "active"`): prompt reconnect.
- Timezone: store IANA on schedule; display local; submit `scheduled_at` as UTC ISO.
- Day toggles: at least one day per row before Save.

---

## 7. Suggested file map

```
src/features/social/
  hooks.ts          # connections, posting-schedule, next-slot, scheduled-posts
  query-keys.ts
  types.ts          # narrow from OpenAPI after gen:api
src/components/social/
  connections-panel.tsx
  page-picker-sheet.tsx
  posting-schedule-sheet.tsx
  schedule-post-sheet.tsx
src/app/(app)/brands/[id]/connections/page.tsx   # optional dedicated route for OAuth return
```

Wire OAuth return on brands page or dedicated connections route that reads `searchParams`.

---

## 8. Out of scope (v1)

- X / TikTok / LinkedIn / YouTube
- Month-grid calendar page (list + status is enough)
- Changing `Post.status` to `scheduled` / `published` (use `scheduled_posts` rows)
- Editing Meta tokens client-side
- Celery / worker UI

---

## 9. Design system notes

- Prefer `Sheet` over one-off Dialogs (matches brands/review).
- Primary button = solid; Cancel = bordered secondary.
- Day chips: high-contrast selected vs muted (screenshot: dark filled vs light).
- No purple “AI default” theme; follow existing Postner tokens (`AGENTS.md` / CSS variables).
- Mobile: sheet from bottom; keep day toggles tappable (min ~36px).

---

## 10. Checklist for FE agent

- [ ] Regenerate API types (`npm run gen:api`) against running BE with these routes
- [ ] Connections list + connect + page picker + disconnect on brand
- [ ] Posting schedule sheet (GET/PUT/reset) with **Save schedule**
- [ ] Schedule Post sheet from approved; CTA **Schedule**; default from `next-slot`
- [ ] Multi-account = multiple `POST /scheduled-posts`
- [ ] Show scheduled/publish status on approved
- [ ] Handle OAuth `error` query param
- [ ] BFF connect redirect if needed for Meta OAuth start
