import type { APIRoute } from 'astro';
import { auth } from '../../../lib/auth';
import { ensureAuthSchema } from '../../../lib/db';

// Better Auth handles all /api/auth/* routes on-demand (OAuth, session, etc.).
export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  await ensureAuthSchema();
  return auth.handler(request);
};
