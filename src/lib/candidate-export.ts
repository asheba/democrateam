import { candidates, LINK_ORDER, type Candidate } from './candidates';
import { abs } from './site';

/**
 * Clean, machine-facing representation of a candidate for JSON/Markdown export.
 * Normalizes the string `female` flag to a real boolean and makes the photo path
 * absolute. Links are emitted in the canonical LINK_ORDER, omitting empty ones.
 */
export interface PublicCandidate {
  id: string;
  name: string;
  title: string;
  bio: string;
  photo: string;
  female: boolean;
  links: Record<string, string>;
}

export function candidateToPublic(c: Candidate): PublicCandidate {
  const links: Record<string, string> = {};
  for (const key of LINK_ORDER) {
    const url = c.links[key];
    if (url) links[key] = url;
  }
  return {
    id: c.id,
    name: c.name,
    title: c.title,
    bio: c.bio,
    photo: abs(c.photo),
    female: c.female === 'true',
    links,
  };
}

/**
 * One Markdown block for a single candidate. `heading` sets the header level so
 * this can be nested inside a team document (default "###" for the flat list).
 */
export function renderCandidateMarkdown(c: Candidate, heading = '###'): string {
  const displayName = c.title ? `${c.title} ${c.name}` : c.name;
  const lines: string[] = [`${heading} ${displayName}`, '', `![${c.name}](${abs(c.photo)})`, '', c.bio];
  const linkKeys = LINK_ORDER.filter((k) => c.links[k]);
  if (linkKeys.length) {
    lines.push('', 'Links:');
    for (const k of linkKeys) lines.push(`- ${k}: ${c.links[k]}`);
  }
  return lines.join('\n');
}

/** Full Markdown corpus of every candidate — shared by /candidates.md and /llms-full.txt. */
export function renderCandidatesMarkdown(): string {
  const parts: string[] = [
    '# Democrats primary candidates',
    '',
    `All ${candidates.length} candidates running in the Democrats (הדמוקרטים) party primary. Content is in Hebrew.`,
    '',
  ];
  for (const c of candidates) parts.push(renderCandidateMarkdown(c), '');
  return parts.join('\n');
}
