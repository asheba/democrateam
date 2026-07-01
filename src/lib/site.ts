/**
 * Absolute base URL of the deployed site. Kept in sync with `site` in
 * astro.config.mjs; both read PUBLIC_SITE_URL. Used to build absolute URLs for
 * canonical tags, JSON-LD, sitemap.xml, robots.txt and the llms.txt files.
 */
export const SITE_URL = (
  import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:4321'
).replace(/\/+$/, '');

/** Build an absolute URL from a site-root-relative path (e.g. "/candidates.md"). */
export function abs(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
