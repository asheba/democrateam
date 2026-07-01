import type { APIRoute } from 'astro';
import { renderCandidatesMarkdown } from '../lib/candidate-export';

// LLM-readable Markdown of the full candidate corpus.
export const GET: APIRoute = () =>
  new Response(renderCandidatesMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
