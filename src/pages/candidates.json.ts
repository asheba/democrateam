import type { APIRoute } from 'astro';
import { candidates } from '../lib/candidates';
import { candidateToPublic } from '../lib/candidate-export';

// Public, clean JSON of all candidates for machine/tool consumption.
export const GET: APIRoute = () =>
  new Response(JSON.stringify(candidates.map(candidateToPublic), null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
