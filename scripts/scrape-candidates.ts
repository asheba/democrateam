/**
 * Scrapes the Democrats party candidate roster from the public site and writes
 * a committed `data/candidates.json` plus downloaded photos in `public/candidates/`.
 *
 * Run with: pnpm scrape
 *
 * The source is a static WordPress/Elementor + JetEngine listing. Each candidate is a
 * `.jet-listing-grid__item`. Names are not in a heading anywhere on the page — they are
 * encoded in the photo / CV file names (e.g. `301495917_נאור_נרקיס_cv_2026...`), which is
 * the same source the original design used. Social links are plain <a href> anchors that we
 * classify by domain.
 */
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";

const SOURCE_URL = "https://democrats.org.il/candidates/";
const ROOT = join(import.meta.dirname, "..");
const PHOTO_DIR = join(ROOT, "public", "candidates");
const DATA_FILE = join(ROOT, "data", "candidates.json");

type Links = {
  website?: string;
  facebook?: string;
  instagram?: string;
  x?: string;
  tiktok?: string;
  linkedin?: string;
  whatsapp?: string;
  cv?: string;
};

type Candidate = {
  id: string;
  name: string;
  title: string;
  photo: string; // local path under /public, e.g. /candidates/cand-01.jpg
  bio: string;
  links: Links;
};

/** Fallback: pull a human name out of an uploaded file URL like `<digits>_<name>_cv_<date>.pdf`. */
function nameFromFileUrl(url: string): string {
  const base = decodeURIComponent(url).split("/").pop() ?? "";
  const m = base.match(/^\d+[_-](.+?)[_-](?:cv|candidatePhoto)[_-]/i);
  const raw = m ? m[1] : base.replace(/\.[a-z0-9]+$/i, "").replace(/^\d+[_-]/, "");
  return raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

// Known Hebrew honorifics/credentials that appear as their own widget before the name.
const CREDENTIALS = new Set(["עוד", "דר", "פרופ", "חכ", "אדר", "אדריכל", "אלוף", "רב", "סאל", "תאל"]);

/** A short widget is a title/credential if it contains a gershayim/geresh and reduces to a known abbreviation. */
function isCredential(part: string): boolean {
  const stripped = part.replace(/["'״׳.\s]/g, "");
  if (CREDENTIALS.has(stripped)) return true;
  return /["'״׳]/.test(part) && stripped.length <= 4;
}

function classifyLink(href: string, links: Links) {
  const h = href.trim();
  if (!h || h === "#") return;
  const lower = h.toLowerCase();
  if (/_cv_|\/cv|\.pdf($|\?)/i.test(lower)) {
    links.cv ??= h;
  } else if (lower.includes("facebook.com")) {
    links.facebook ??= h;
  } else if (lower.includes("instagram.com")) {
    links.instagram ??= h;
  } else if (lower.includes("twitter.com") || /(^|\/\/)([^/]*\.)?x\.com\//.test(lower)) {
    links.x ??= h;
  } else if (lower.includes("tiktok.com")) {
    links.tiktok ??= h;
  } else if (lower.includes("linkedin.com")) {
    links.linkedin ??= h;
  } else if (lower.includes("wa.me") || lower.includes("whatsapp.com")) {
    links.whatsapp ??= h;
  } else {
    // personal site, linktr.ee aggregator, etc.
    links.website ??= h;
  }
}

async function downloadPhoto(url: string, id: string): Promise<string> {
  const encoded = encodeURI(decodeURIComponent(url));
  const res = await fetch(encoded, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`photo ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const extMatch = url.toLowerCase().match(/\.(jpe?g|png|webp)(?:$|\?)/);
  const ext = extMatch ? extMatch[1].replace("jpeg", "jpg") : "jpg";
  const file = `${id}.${ext}`;
  await writeFile(join(PHOTO_DIR, file), buf);
  return `/candidates/${file}`;
}

async function main() {
  await mkdir(PHOTO_DIR, { recursive: true });
  await mkdir(join(ROOT, "data"), { recursive: true });

  console.log(`Fetching ${SOURCE_URL} ...`);
  const res = await fetch(SOURCE_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`source -> ${res.status}`);
  const $ = cheerio.load(await res.text());

  const items = $(".jet-listing-grid__item");
  console.log(`Found ${items.length} candidate cards.`);

  // The source lists candidates in a randomized order on each load, so first collect every card,
  // then sort by name to assign stable ids (cand-01..) and file names across re-scrapes.
  type Raw = { name: string; title: string; bio: string; links: Links; photoUrl: string };
  const raw: Raw[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items.eq(i);

    // photo: first image hosted under the 2026 uploads folder (the others are CV/website icons)
    let photoUrl = "";
    it.find("img").each((_, img) => {
      const src = $(img).attr("src") ?? "";
      if (!photoUrl && /\/uploads\/2026\//.test(src)) photoUrl = src;
    });
    if (!photoUrl) photoUrl = it.find("img").first().attr("src") ?? "";

    // The card holds the name (split across short text-editor widgets: [credential?, first, last])
    // and the bio (the longest text-editor widget).
    const texts: string[] = [];
    it.find(".elementor-widget-text-editor").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t) texts.push(t);
    });
    let bio = "";
    let bioIdx = -1;
    texts.forEach((t, idx) => {
      if (t.length > bio.length) {
        bio = t;
        bioIdx = idx;
      }
    });
    if (bio.length < 35) {
      bio = "";
      bioIdx = -1;
    }
    const nameWidgets = texts.filter((_, idx) => idx !== bioIdx);
    const title = nameWidgets.filter(isCredential).join(" ").trim();
    const name =
      nameWidgets.filter((p) => !isCredential(p)).join(" ").trim() ||
      nameFromFileUrl(photoUrl) ||
      `מועמד/ת ${i + 1}`;

    // links: classify every real anchor in the card
    const links: Links = {};
    it.find("a[href]").each((_, a) => {
      const href = $(a).attr("href");
      if (href) classifyLink(href, links);
    });

    raw.push({ name, title, bio, links, photoUrl });
  }

  raw.sort((a, b) => a.name.localeCompare(b.name, "he"));

  // Rebuild the photo dir from scratch so re-scrapes never leave orphan files.
  await rm(PHOTO_DIR, { recursive: true, force: true });
  await mkdir(PHOTO_DIR, { recursive: true });

  const candidates: Candidate[] = [];
  for (let i = 0; i < raw.length; i++) {
    const id = `cand-${String(i + 1).padStart(2, "0")}`;
    const entry = raw[i];

    let photo = "";
    try {
      photo = await downloadPhoto(entry.photoUrl, id);
    } catch (e) {
      console.warn(`  ! photo download failed for ${entry.name}: ${(e as Error).message}`);
    }

    candidates.push({ id, name: entry.name, title: entry.title, photo, bio: entry.bio, links: entry.links });
    console.log(
      `  [${id}] ${entry.name}${entry.title ? ` (${entry.title})` : ""} — ${Object.keys(entry.links).length} links`
    );
  }

  await writeFile(DATA_FILE, JSON.stringify(candidates, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${candidates.length} candidates to ${DATA_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
