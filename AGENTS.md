<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Postner web app — conventions

Read `README.md` first. Non-negotiables:

- **Types come from the API.** Run `npm run gen:api` against a running backend
  rather than hand-writing request/response types. The only hand-written shapes
  are the open dicts in `src/lib/api/types.ts`.
- **No hex values in components.** Use the `@theme` tokens in
  `src/app/globals.css`. Accent green pairs with `text-accent-ink`, never white.
- **The browser calls `/api/proxy`, never the API host.** The JWT is an httpOnly
  cookie; nothing client-side should ever read or store a token.
- **Derive state, do not sync it in effects.** The React Compiler lint rules
  reject `setState` in an effect body and they are correct to.
- `npm run typecheck && npm run lint && npm run build` must pass before you
  call anything done.
