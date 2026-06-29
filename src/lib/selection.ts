/** Selection rules + localStorage persistence shared by the grid and the share form. */
export const MIN_SELECTION = 6;
export const MAX_SELECTION = 8;
const STORAGE_KEY = 'democrateam.selection';

export function isValidCount(n: number): boolean {
  return n >= MIN_SELECTION && n <= MAX_SELECTION;
}

export function loadSelection(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveSelection(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function clearSelection(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
