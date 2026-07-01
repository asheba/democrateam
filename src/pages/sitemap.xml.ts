import type { APIRoute } from 'astro';
import { abs } from '../lib/site';

// Stable static routes only. Voter-created /team/{uuid} pages are public but
// unlisted (noindex), so they are deliberately excluded.
const ROUTES = [
  '/',
  '/share',
  '/candidates.md',
  '/candidates.json',
  '/llms.txt',
  '/llms-full.txt',
];

export const GET: APIRoute = () => {
  const urls = ROUTES.map((r) => `  <url><loc>${abs(r)}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
