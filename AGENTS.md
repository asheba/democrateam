# Democrateam — app stack

This repo is an **Astro 7 + React islands** app (not Next.js), deployed to Vercel.

- Pages live in `src/pages/` (`.astro`). `output: 'static'` by default — `/` and `/share`
  prerender to static HTML; routes that need a server set `export const prerender = false`
  (`src/pages/team/[uuid].astro`, `src/pages/api/teams.ts`).
- React islands (`.tsx`) are hydrated with `client:*` directives; otherwise React components
  render to static HTML with zero client JS.
- **All Hebrew UI copy lives in `src/i18n/he.json`** (typed via `src/i18n/index.ts` as `t.*`).
  Do not embed Hebrew literals in `.astro`/`.tsx` code — edit `he.json`.
- Candidate content is `data/candidates.json`; photos in `public/candidates/`.
- Storage is libSQL/Turso via `src/lib/db.ts`. With no `TURSO_*` env vars it falls back to a
  local `file:local.db`. Team rows are **immutable** (insert-only).
- Astro 7 may differ from older training data — check `node_modules/astro` types when unsure.

Run: `pnpm dev` · `pnpm build` · `pnpm preview`.
