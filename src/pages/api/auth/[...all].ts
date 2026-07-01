import type { APIRoute } from 'astro';
import { auth } from '../../../lib/auth';

// Better Auth handles all /api/auth/* routes on-demand (OAuth, session, etc.).
export const prerender = false;

export const ALL: APIRoute = ({ request }) => auth.handler(request);
