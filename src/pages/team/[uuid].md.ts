import type { APIRoute } from 'astro';
import { getCandidate } from '../../lib/candidates';
import { getTeam } from '../../lib/db';
import { renderCandidateMarkdown } from '../../lib/candidate-export';

// On-demand: a specific voter's team as LLM-readable Markdown. Mirrors the read
// done by team/[uuid].astro, including the 404 behaviour.
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const team = params.uuid ? await getTeam(params.uuid) : null;
  if (!team) {
    return new Response('Team not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const parts: string[] = [`# ${team.voterName}'s team`, ''];
  if (team.summary) parts.push('## Summary', '', team.summary, '');
  parts.push('## Selected candidates', '');

  for (const sel of team.selections) {
    const candidate = getCandidate(sel.candidateId);
    if (!candidate) continue;
    parts.push(renderCandidateMarkdown(candidate, '###'), '');
    if (sel.explanation) {
      parts.push(`Voter's reason: ${sel.explanation}`, '');
    }
  }

  return new Response(parts.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
