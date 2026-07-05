/**
 * fix-candidates.ts
 *
 * 1. Saves a name→properties mapping CSV (scripts/candidate-properties.csv)
 *    from the current candidates.json on first run; subsequent runs read it
 *    back and apply the boolean-ish flags (female, kafri, meretz, minority).
 * 2. Sorts candidates.json alphabetically by Hebrew name and assigns new IDs
 *    (cand-01 … cand-NN) in that order.  Photo files in public/candidates/
 *    are renamed to stay in sync.  The daily on-view reordering happens at
 *    runtime (see src/lib/daily-order.ts); this file only fixes the canonical
 *    alphabetical order and stable ids.
 *
 * Run: pnpm tsx scripts/fix-candidates.ts
 */

import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CANDIDATES_FILE = join(ROOT, 'data', 'candidates.json');
const CSV_FILE        = join(__dirname, 'candidate-properties.csv');
const PHOTOS_DIR      = join(ROOT, 'public', 'candidates');

// Boolean-ish flag columns (besides `name`) kept in the CSV and mirrored into
// candidates.json as the strings "true"/"false".
const FLAGS = ['female', 'kafri', 'meretz', 'minority'] as const;
type Flag = (typeof FLAGS)[number];

type Candidate = {
  id: string;
  name: string;
  title: string;
  photo: string;
  bio: string;
  links: Record<string, string>;
} & Record<Flag, string>;

// ── 1. Load candidates ──────────────────────────────────────────────────────

const candidates: Candidate[] = JSON.parse(readFileSync(CANDIDATES_FILE, 'utf-8'));

// ── 2. Persist name→properties mapping to CSV (create if absent) ────────────

if (!existsSync(CSV_FILE)) {
  const header = ['name', ...FLAGS].join(',');
  const lines = [
    header,
    ...candidates.map(c => [`"${c.name}"`, ...FLAGS.map(f => c[f] ?? 'false')].join(',')),
  ];
  writeFileSync(CSV_FILE, lines.join('\n') + '\n', 'utf-8');
  console.log(`Created ${CSV_FILE}`);
} else {
  console.log(`Using existing ${CSV_FILE}`);
}

// Read mapping from CSV (source of truth for the flag columns). The header row
// declares which flag each column holds, so column order is not assumed.
const rows = readFileSync(CSV_FILE, 'utf-8').split('\n').filter(l => l.trim());
const columns = rows[0].split(',').slice(1) as Flag[];
const flagMap = new Map<string, Partial<Record<Flag, string>>>();
for (const line of rows.slice(1)) {
  const m = line.match(/^"([^"]+)",(.+)$/);
  if (!m) continue;
  const values = m[2].split(',').map(v => v.trim());
  const flags: Partial<Record<Flag, string>> = {};
  columns.forEach((col, i) => {
    if (values[i] === 'true' || values[i] === 'false') flags[col] = values[i];
  });
  flagMap.set(m[1], flags);
}

// ── 3. Sort alphabetically by Hebrew name ────────────────────────────────────
// Mirrors the collator used in scrape-candidates.ts. Ids are assigned in this
// stable order; the visible per-day rotation happens at runtime on "/".

const ordered = [...candidates].sort((a, b) => a.name.localeCompare(b.name, 'he'));

// ── 4. Build reordered list with new IDs ────────────────────────────────────

const reordered: (Candidate & { _oldPhoto: string })[] = [];

for (let i = 0; i < ordered.length; i++) {
  const c    = ordered[i];
  const newId = `cand-${String(i + 1).padStart(2, '0')}`;
  const ext   = extname(c.photo);                      // e.g. ".jpg"
  const newPhoto = `/candidates/${newId}${ext}`;

  const flags = flagMap.get(c.name) ?? {};
  const resolvedFlags = Object.fromEntries(
    FLAGS.map(f => [f, flags[f] ?? c[f] ?? 'false']),
  ) as Record<Flag, string>;

  reordered.push({
    ...c,
    id:         newId,
    ...resolvedFlags,
    photo:      newPhoto,
    _oldPhoto:  c.photo,
  });
}

// ── 5. Rename photo files (two-pass to avoid collisions) ────────────────────

// Pass A: rename old → temp
for (const c of reordered) {
  const oldFile = join(PHOTOS_DIR, c._oldPhoto.replace('/candidates/', ''));
  const tmpFile = oldFile + '.tmp';
  if (existsSync(oldFile)) renameSync(oldFile, tmpFile);
}

// Pass B: rename temp → new
for (const c of reordered) {
  const oldFile = join(PHOTOS_DIR, c._oldPhoto.replace('/candidates/', ''));
  const tmpFile = oldFile + '.tmp';
  const newFile = join(PHOTOS_DIR, c.photo.replace('/candidates/', ''));
  if (existsSync(tmpFile)) renameSync(tmpFile, newFile);
}

// ── 6. Write candidates.json ─────────────────────────────────────────────────

const output = reordered.map(({ _oldPhoto: _unused, ...c }) => c);
writeFileSync(CANDIDATES_FILE, JSON.stringify(output, null, 2) + '\n', 'utf-8');
console.log(`Wrote ${output.length} candidates to ${CANDIDATES_FILE}`);
console.log('Done.');
