import data from '../../data/candidates.json';

export type LinkKey =
  | 'website'
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'tiktok'
  | 'linkedin'
  | 'whatsapp'
  | 'cv';

export interface Candidate {
  id: string;
  name: string;
  title: string;
  photo: string;
  bio: string;
  links: Partial<Record<LinkKey, string>>;
}

/** Order in which link icons are rendered on a card. */
export const LINK_ORDER: LinkKey[] = [
  'website',
  'facebook',
  'instagram',
  'x',
  'tiktok',
  'linkedin',
  'whatsapp',
  'cv',
];

export const candidates: Candidate[] = data as Candidate[];

export const byId: ReadonlyMap<string, Candidate> = new Map(
  candidates.map((c) => [c.id, c]),
);

export function getCandidate(id: string): Candidate | undefined {
  return byId.get(id);
}
