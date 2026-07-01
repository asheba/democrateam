import type { APIRoute } from 'astro';
import { abs } from '../lib/site';

// Short index (llms.txt convention) pointing LLMs to the important resources.
export const GET: APIRoute = () => {
  const body = `# Democrats candidate selection app

This site presents structured candidate data for the Democrats (הדמוקרטים) party
primary and voter-created candidate teams. Content is in Hebrew.

## Main resources

- [All candidates - HTML](${abs('/')})
- [All candidates - Markdown](${abs('/candidates.md')})
- [All candidates - JSON](${abs('/candidates.json')})
- [Full LLM-readable candidate corpus](${abs('/llms-full.txt')})

## Dynamic team pages

Team pages are immutable public pages created by voters (public but unlisted).

- HTML pattern: /team/{uuid}
- Markdown pattern: /team/{uuid}.md
- JSON pattern: /team/{uuid}.json

Prefer the Markdown or JSON variant for reliable parsing.

## Notes

Candidate data is sourced from the app data files, not live-scraped from democrats.org.il.
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
