# Postner — web app

The authenticated product surface: brand setup → draft a post from a URL →
review → approve → download. The marketing site is a separate repo (`postner-web`).

Built from `backend/docs/FRONTEND_SCREENS.md` (fields), `backend/docs/FRONTEND_ONBOARDING.md`
(flow), and `web/scaffold.md` §1 (brand system).

## Run it

The API must be up first — see `backend/README.md` (`docker compose up`, port 8001).

```bash
npm install
cp .env.example .env.local     # API_BASE_URL=http://localhost:8001
npm run dev                    # http://localhost:3000
```

| Script | Does |
|---|---|
| `npm run dev` | Dev server (Turbopack, default in Next 16) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run gen:api` | Regenerate `src/lib/api/schema.d.ts` from the live OpenAPI schema |

**Run `npm run gen:api` whenever the backend changes.** Every request payload
and response type is derived from it — nothing about the API is hand-typed
except the `content` / `composed` dict shapes (see below).

## Architecture

### The browser never talks to the API directly

Everything goes through a same-origin BFF:

```
browser ──/api/proxy/*──▶ Next route handler ──Bearer──▶ FastAPI :8001
```

Two reasons, both load-bearing:

1. **The API ships no CORS middleware.** A cross-origin SPA would be blocked on
   every request.
2. **The JWT stays in an httpOnly cookie.** It is never readable by JS, so an
   XSS bug cannot exfiltrate the session. Credentials are exchanged at
   `/api/auth/{login,register}`, which set the cookie; those paths are blocked
   through `/api/proxy` so there is exactly one way in.

`src/proxy.ts` (Next 16 renamed Middleware → Proxy) does an optimistic
cookie-presence redirect. It is UX, not authorization — the API remains the
authority on every request.

### Layout

```
src/
  app/
    (auth)/            login, register
    (app)/             brands, posts/new, posts/[id], review
    api/
      auth/*           credential exchange → httpOnly cookie
      proxy/[...path]  authenticated passthrough to FastAPI
      download/…       streams one composed page as a file
  proxy.ts             route protection
  components/
    ui/                button, field, chip, sheet, switch, feedback, logo
    post/              post-card, fab-row, generating
    review/            review-surface + reject / edit / download sheets
    brand/             brand-form
  features/            auth, brands, posts, catalog — hooks + screen-level forms
  lib/
    api/               generated schema, typed clients, domain types
    formats.ts         the six post formats, labels, dimensions
```

### Design system

Tokens live in `src/app/globals.css` under `@theme` (Tailwind v4). They come
from `web/scaffold.md` §1.3, so the app and the marketing site share a palette.
**Never hard-code a hex value in a component.**

Two rules that are easy to get wrong:

- **Accent green takes dark text**, not white — `text-accent-ink` on
  `bg-accent`. White on `#9FC131` fails AA.
- **The app canvas is light; the post card is dark.** That inversion is the
  identity, per `backend/docs/review-screen-reference.png`. Do not put the app
  in dark mode to match the card.

## Decisions worth knowing

**The review queue is a card stack, not a detail page.** `architecture.md` §3.6
makes working through a batch the signal that drives generation of the next
one, so the queue is the unit of review. `/posts/[id]` reuses the same
`ReviewSurface` for deep links.

**Draft → images → compose runs automatically.** The API splits these because
they cost different amounts, but a person creating a post wants one outcome.
`usePostPipeline` runs the remaining legs and surfaces them as progress
(`src/components/post/generating.tsx`) instead of three buttons.

**`content` / `composed` / `images` are hand-typed.** FastAPI declares them as
`dict[str, Any]`, so the generated schema types them as open dicts. The
interfaces in `src/lib/api/types.ts` mirror what `app/posts/service.py`
actually writes — keep them in sync if the service changes.

**Downloads are proxied, not linked.** `/api/download/[postId]/[pageId]` reads
the asset URL back from the authoritative post record server-side rather than
accepting one from the request, so it cannot be used as an open proxy.

## Known limitation: local storage mode

With `STORAGE_BACKEND=local` (the API default), `composed.pages[].url` is a
filesystem path *inside the API container* (`/app/output/…`) and the backend
serves no route for it. Composed previews and downloads therefore cannot work.

The app handles this honestly — it shows "Preview not available" with the
reason instead of a broken image — but to actually see rendered posts you need
either:

- `STORAGE_BACKEND=s3` on the API (R2 / S3 / MinIO all work), **or**
- a static mount or streaming route added to the backend for `output/`.

## Not built yet

Deliberately out of scope for v1, all optional in the FE spec: MP4 export
(`/animate`), the revision history list (`/revisions` is wired but only shown
as a count), per-slide reject scoping beyond the picker, and the
`/packs/propose` + `/variants/propose` design-generation flows.

## Next.js 16

Breaking changes vs. what most references assume — read
`node_modules/next/dist/docs/` before writing code:

- `middleware.ts` → **`proxy.ts`**
- `cookies()`, `headers()`, `params`, `searchParams` are **async**
- Turbopack is the default; no `--turbopack` flag
- The React Compiler lint rules reject `setState` inside an effect — derive
  state instead (see `new-post-form.tsx` for the pattern)
