/**
 * fix-candidates.ts
 *
 * 1. Saves a name→female mapping CSV (scripts/female-mapping.csv) from the
 *    current candidates.json on first run; subsequent runs read it back.
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
const CSV_FILE        = join(__dirname, 'female-mapping.csv');
const PHOTOS_DIR      = join(ROOT, 'public', 'candidates');

type Candidate = {
  id: string;
  name: string;
  title: string;
  female: string;
  photo: string;
  bio: string;
  links: Record<string, string>;
};

// ── 1. Load candidates ──────────────────────────────────────────────────────

const candidates: Candidate[] = JSON.parse(readFileSync(CANDIDATES_FILE, 'utf-8'));

// ── 2. Persist name→female mapping to CSV (create if absent) ────────────────

if (!existsSync(CSV_FILE)) {
  const lines = ['name,female', ...candidates.map(c => `"${c.name}",${c.female}`)];
  writeFileSync(CSV_FILE, lines.join('\n') + '\n', 'utf-8');
  console.log(`Created ${CSV_FILE}`);
} else {
  console.log(`Using existing ${CSV_FILE}`);
}

// Read mapping from CSV (source of truth for female values)
const femaleMap = new Map<string, string>();
for (const line of readFileSync(CSV_FILE, 'utf-8').split('\n').slice(1)) {
  const m = line.match(/^"([^"]+)",(true|false)\s*$/);
  if (m) femaleMap.set(m[1], m[2]);
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

  reordered.push({
    ...c,
    id:         newId,
    female:     femaleMap.get(c.name) ?? c.female,
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
