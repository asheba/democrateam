import type { APIRoute } from 'astro';
import { byId } from '../../lib/candidates';
import { insertTeam, type TeamSelection } from '../../lib/db';
import { MIN_SELECTION, MAX_SELECTION } from '../../lib/selection';
import {
  MAX_VOTER_NAME,
  MAX_EXPLANATION,
  MAX_SUMMARY,
  MAX_VOTER_IMAGE_URL,
} from '../../lib/limits';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const bad = (msg: string) => json({ error: msg }, 400);

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad('invalid json');
  }
  if (typeof body !== 'object' || body === null) return bad('invalid body');
  const b = body as Record<string, unknown>;

  // voter name (required)
  const voterName = typeof b.voterName === 'string' ? b.voterName.trim() : '';
  if (!voterName || voterName.length > MAX_VOTER_NAME) return bad('invalid voterName');

  // voter image url (optional, must be http(s) to be safe to render in <img>)
  let voterImage: string | null = null;
  if (b.voterImage != null) {
    if (typeof b.voterImage !== 'string') return bad('invalid voterImage');
    const url = b.voterImage.trim();
    if (url) {
      if (url.length > MAX_VOTER_IMAGE_URL || !/^https?:\/\//i.test(url)) {
        return bad('invalid voterImage');
      }
      voterImage = url;
    }
  }

  // summary (optional)
  let summary: string | null = null;
  if (b.summary != null) {
    if (typeof b.summary !== 'string') return bad('invalid summary');
    const s = b.summary.trim();
    if (s.length > MAX_SUMMARY) return bad('summary too long');
    summary = s || null;
  }

  // selections (6–8, valid + unique candidate ids, explanation length capped)
  if (!Array.isArray(b.selections)) return bad('invalid selections');
  if (b.selections.length < MIN_SELECTION || b.selections.length > MAX_SELECTION) {
    return bad('selection count out of range');
  }
  const seen = new Set<string>();
  const selections: TeamSelection[] = [];
  for (const raw of b.selections) {
    if (typeof raw !== 'object' || raw === null) return bad('invalid selection item');
    const item = raw as Record<string, unknown>;
    const candidateId = item.candidateId;
    if (typeof candidateId !== 'string' || !byId.has(candidateId)) {
      return bad('unknown candidate');
    }
    if (seen.has(candidateId)) return bad('duplicate candidate');
    seen.add(candidateId);
    const explanation = typeof item.explanation === 'string' ? item.explanation.trim() : '';
    if (explanation.length > MAX_EXPLANATION) return bad('explanation too long');
    selections.push({ candidateId, explanation });
  }

  const uuid = crypto.randomUUID();
  try {
    await insertTeam({ uuid, voterName, voterImage, summary, selections });
  } catch {
    return json({ error: 'storage error' }, 500);
  }
  return json({ uuid }, 201);
};
