import type { APIRoute } from 'astro';
import { byId } from '../../lib/candidates';
import {
  insertTeam,
  updateTeam,
  getTeamByPassword,
  getTeamByUserId,
  type TeamSelection,
} from '../../lib/db';
import { auth } from '../../lib/auth';
import { t } from '../../i18n';
import { MIN_SELECTION, MAX_SELECTION } from '../../lib/selection';
import { MAX_VOTER_NAME, MAX_EXPLANATION, MAX_SUMMARY } from '../../lib/limits';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const bad = (msg: string) => json({ error: msg }, 400);

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Authenticated users: their (verified) team is keyed by user id.
    const session = await auth.api.getSession({ headers: request.headers });
    if (session) {
      const team = await getTeamByUserId(session.user.id);
      if (!team) return json({ error: 'not found' }, 404);
      return json(team);
    }

    // Anonymous users: keep the password-UUID lookup (from localStorage creds).
    const uuid = url.searchParams.get('uuid') ?? '';
    const password = url.searchParams.get('password') ?? '';
    if (!uuid || !password) return bad('missing params');
    const team = await getTeamByPassword(password);
    if (!team || team.uuid !== uuid) return json({ error: 'unauthorized' }, 401);
    return json(team);
  } catch {
    return json({ error: 'storage error' }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad('invalid json');
  }
  if (typeof body !== 'object' || body === null) return bad('invalid body');
  const b = body as Record<string, unknown>;

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

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    // ---- Verified path: identity comes from the social profile ----
    if (session) {
      const voterName = (session.user.name || '').trim() || t.share.anonName;
      const voterImage = session.user.image ?? null;
      const existing = await getTeamByUserId(session.user.id);
      if (existing) {
        const ok = await updateTeam(existing.uuid, {
          voterName,
          voterImage,
          summary,
          selections,
        });
        if (!ok) return json({ error: 'storage error' }, 500);
        return json({ uuid: existing.uuid }, 200);
      }
      const uuid = crypto.randomUUID();
      await insertTeam({
        uuid,
        voterName,
        voterImage,
        summary,
        selections,
        password: '',
        userId: session.user.id,
        verified: true,
      });
      return json({ uuid }, 201);
    }

    // ---- Anonymous path: typed name, no image, password-UUID ownership ----
    const voterName = typeof b.voterName === 'string' ? b.voterName.trim() : '';
    if (!voterName || voterName.length > MAX_VOTER_NAME) return bad('invalid voterName');

    const password =
      typeof b.password === 'string' && b.password.trim().length > 0
        ? b.password.trim()
        : crypto.randomUUID();

    const existing = await getTeamByPassword(password);
    if (existing) {
      const ok = await updateTeam(existing.uuid, {
        voterName,
        voterImage: null,
        summary,
        selections,
      });
      if (!ok) return json({ error: 'storage error' }, 500);
      return json({ uuid: existing.uuid }, 200);
    }
    const uuid = crypto.randomUUID();
    await insertTeam({
      uuid,
      voterName,
      voterImage: null,
      summary,
      selections,
      password,
      userId: null,
      verified: false,
    });
    return json({ uuid }, 201);
  } catch {
    return json({ error: 'storage error' }, 500);
  }
};
