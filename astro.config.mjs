// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // Static by default: `/` and `/share` prerender to plain HTML (fast + AI-ingestible).
  // Routes that opt out with `export const prerender = false` (the team view and the
  // DB-write endpoint) render on-demand as Vercel serverless functions.
  output: 'static',
  adapter: vercel(),
  integrations: [react()],
});
