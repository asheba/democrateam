# Democrateam 

Fast and AI friendly candidate list for Israeli **Democrats** party primaries (20.7.2026).

## App

Built with **Astro + React islands** (static by default, server-rendered only where needed),
deployed to Vercel, with selections stored in **Turso / libSQL**. All Hebrew UI copy lives in
`src/i18n/he.json` (no Hebrew literals in code). Three pages:

1. **`/` — candidates** (static, prerendered). Lists all 51 candidates with full bio and links
   inlined into the HTML — no clicks to expand — so the page loads instantly and is easy to feed to
   AI tools. A React island adds *selection mode*: pick **6–8** candidates (selecting a 9th is
   blocked), a floating bar shows the chosen avatars/names, and once 6–8 are selected the
   "share my selection" button leads to `/share`. The selection is kept in `localStorage`.

2. **`/share` — share my selection** (static shell + React form). Reads the selection and collects a
   required voter name, optional voter image URL, an optional per-candidate explanation (≤300 chars),
   and an optional summary (≤500 chars). Each candidate shows as a compact, expandable tile.
   On submit it `POST`s to `/api/teams`, which validates server-side and writes one **immutable**
   row to the DB, then redirects to the new team page.

3. **`/team/[uuid]` — view a team** (server-rendered on demand). Reads a saved team by UUID (404 if
   missing) and shows it read-only: voter name/image, summary, and the full candidate cards in the
   same multi-column grid as `/`, each with an info tooltip revealing why it was chosen.

### Run

```bash
pnpm install
pnpm dev      # http://localhost:4321
pnpm build && pnpm preview
```

Storage uses `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`; with neither set it falls back to a local
`file:local.db` so the full flow works offline (see `.env.example`).

## Candidate data

`data` and `scripts` dirs allow reading the data from the original Elementor site.

- `data/candidates.json` — 51 candidates: `{ id, name, female, title, photo, bio, links }`
  where `links` is a subset of `{ website, facebook, instagram, x, tiktok, linkedin, whatsapp, cv }`.
- `public/candidates/` — downloaded candidate photos referenced by `photo` (e.g. `/candidates/cand-01.jpg`).
- `scripts/scrape-candidates.ts` — scraper.
- `scripts/fix-candidate.ts` + `scripts/female-mapping.csv` + `data/order.csv` — modify naive scraper to hold correct data as shown in the original site for the democratic party. 

### Re-scrape

```bash
pnpm install
pnpm scrape
```

Source: https://democrats.org.il/candidates/ (static WordPress/Elementor listing). The scraper
extracts each candidate's name (+ credential), bio, and social links, and downloads photos into
`public/candidates/`.

