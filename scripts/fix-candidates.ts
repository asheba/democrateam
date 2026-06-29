/**
 * fix-candidates.ts
 *
 * 1. Saves a name→female mapping CSV (scripts/female-mapping.csv) from the
 *    current candidates.json on first run; subsequent runs read it back.
 * 2. Reorders candidates.json to match data/order.txt and assigns new IDs
 *    (cand-01 … cand-51) in that order.  Photo files in public/candidates/
 *    are renamed to stay in sync.
 *
 * Run: pnpm tsx scripts/fix-candidates.ts
 */

import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CANDIDATES_FILE = join(ROOT, 'data', 'candidates.json');
const ORDER_FILE      = join(ROOT, 'data', 'order.txt');
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

// ── 3. Parse order.txt ───────────────────────────────────────────────────────

const orderedNames: string[] = readFileSync(ORDER_FILE, 'utf-8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean);

if (orderedNames.length !== 51) {
  throw new Error(`Expected 51 names in order.txt, got ${orderedNames.length}`);
}

// ── 4. Build lookup: name variants → candidate ───────────────────────────────

const byName = new Map<string, Candidate>(candidates.map(c => [c.name, c]));

function findCandidate(orderName: string): Candidate {
  // Exact match
  if (byName.has(orderName)) return byName.get(orderName)!;
  // Candidate name contains the order name (e.g. "אלוף במיל. נמרוד שפר" ⊇ "נמרוד שפר")
  for (const [name, c] of byName) {
    if (name.includes(orderName)) return c;
  }
  // Order name contains candidate name
  for (const [name, c] of byName) {
    if (orderName.includes(name)) return c;
  }
  throw new Error(`Could not find candidate for order name: "${orderName}"`);
}

// ── 5. Build reordered list with new IDs ────────────────────────────────────

const reordered: (Candidate & { _oldPhoto: string })[] = [];

for (let i = 0; i < orderedNames.length; i++) {
  const c    = findCandidate(orderedNames[i]);
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

// ── 6. Rename photo files (two-pass to avoid collisions) ────────────────────

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

// ── 7. Write candidates.json ─────────────────────────────────────────────────

const output = reordered.map(({ _oldPhoto: _unused, ...c }) => c);
writeFileSync(CANDIDATES_FILE, JSON.stringify(output, null, 2) + '\n', 'utf-8');
console.log(`Wrote ${output.length} candidates to ${CANDIDATES_FILE}`);
console.log('Done.');
