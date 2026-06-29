import he from './he.json';

/**
 * Single source of truth for all Hebrew UI copy. Components must reference `t.*`
 * rather than embedding Hebrew literals, so all wording is editable in `he.json`.
 */
export const t = he;
export type Strings = typeof he;

/** Interpolate `{name}` style placeholders, e.g. fmt(t.team.heading, { name }). */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
