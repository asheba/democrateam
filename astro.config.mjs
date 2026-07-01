// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // Absolute base URL for canonical tags, JSON-LD, sitemap, robots and llms.txt.
  // Set PUBLIC_SITE_URL in the environment (Vercel) to the production domain.
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  // Static by default: `/` and `/share` prerender to plain HTML (fast + AI-ingestible).
  // Routes that opt out with `export const prerender = false` (the team view and the
  // DB-write endpoint) render on-demand as Vercel serverless functions.
  output: 'static',
  adapter: vercel(),
  integrations: [react()],
});
