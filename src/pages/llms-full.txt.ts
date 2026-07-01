import type { APIRoute } from 'astro';
import { abs } from '../lib/site';
import { renderCandidatesMarkdown } from '../lib/candidate-export';

// Full stable corpus in one document: site explanation + every candidate.
// A user can paste this URL into an LLM to compare candidates.
export const GET: APIRoute = () => {
  const preamble = [
    '# Democrats candidate selection app',
    '',
    'This site presents the candidates running in the Democrats (הדמוקרטים) party primary',
    'and lets voters assemble and share a personal team of 6–8 candidates.',
    '',
    'Source of truth:',
    `- HTML: ${abs('/')}`,
    `- Markdown: ${abs('/candidates.md')}`,
    `- JSON: ${abs('/candidates.json')}`,
    '',
    'Candidate data is sourced from the app data files, not live-scraped from democrats.org.il.',
    '',
    '---',
    '',
  ].join('\n');

  return new Response(preamble + renderCandidatesMarkdown(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
