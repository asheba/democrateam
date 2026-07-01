import type { APIRoute } from 'astro';
import { getCandidate } from '../../lib/candidates';
import { getTeam } from '../../lib/db';
import { candidateToPublic } from '../../lib/candidate-export';

// On-demand: a specific voter's team as machine-readable JSON with expanded
// candidate data. Mirrors the read done by team/[uuid].astro.
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const team = params.uuid ? await getTeam(params.uuid) : null;
  if (!team) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const selections = team.selections
    .map((sel) => {
      const candidate = getCandidate(sel.candidateId);
      return candidate
        ? { explanation: sel.explanation, candidate: candidateToPublic(candidate) }
        : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const body = {
    uuid: team.uuid,
    voterName: team.voterName,
    summary: team.summary,
    createdAt: team.createdAt,
    verified: team.verified,
    selections,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
