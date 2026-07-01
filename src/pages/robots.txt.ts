import type { APIRoute } from 'astro';
import { abs } from '../lib/site';

// Allow all crawlers; point them at the sitemap. Team pages are noindex per-page.
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
