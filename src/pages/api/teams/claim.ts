import type { APIRoute } from 'astro';
import { auth } from '../../../lib/auth';
import { t } from '../../../i18n';
import { getTeamByUserId, getTeamByPassword, claimTeam } from '../../../lib/db';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Called right after a user logs in: if they don't yet own a (verified) team but
 * the client still holds the anonymous team's password (from localStorage), take
 * that team over and upgrade it to a verified, user-owned team.
 */
export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const password =
    typeof (body as Record<string, unknown>)?.password === 'string'
      ? ((body as Record<string, unknown>).password as string).trim()
      : '';
  if (!password) return json({ error: 'missing password' }, 400);

  try {
    // Already own a team → nothing to claim; return it so the client can prefill.
    const existing = await getTeamByUserId(session.user.id);
    if (existing) return json(existing);

    const anon = await getTeamByPassword(password);
    if (!anon || anon.verified) return json({ error: 'not found' }, 404);

    const voterName = (session.user.name || '').trim() || t.share.anonName;
    const voterImage = session.user.image ?? null;
    const ok = await claimTeam(anon.uuid, session.user.id, voterName, voterImage);
    if (!ok) return json({ error: 'storage error' }, 500);

    return json({ ...anon, voterName, voterImage, verified: true });
  } catch {
    return json({ error: 'storage error' }, 500);
  }
};
