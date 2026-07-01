/**
 * daily-order.ts
 *
 * Deterministic once-a-day reordering of a list, keyed on the Israel calendar
 * day (Asia/Jerusalem). Every visitor sees the same order on a given day, and
 * it reshuffles at local midnight. Pure functions — the input array (and thus
 * canonical candidate order / stable ids) is never mutated.
 *
 * NOTE: the home page (src/pages/index.astro) inlines a vanilla mirror of this
 * algorithm (djb2 hash + mulberry32 + Fisher–Yates) in a synchronous pre-paint
 * `is:inline` script so the daily order is applied via CSS `order` before first
 * paint. Any change to the algorithm here MUST be mirrored there.
 */

/** `YYYY-MM-DD` for the given instant in Asia/Jerusalem (DST-safe). */
export function israelDayKey(date: Date = new Date()): string {
  // en-CA formats as ISO-like YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** 32-bit hash of a string (variant of djb2). */
function hashSeed(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

/** Small, fast, seedable PRNG. Returns floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Fisher–Yates shuffle. Returns a new array; does not mutate
 * `arr`. The same `seed` always yields the same order.
 */
export function seededShuffle<T>(arr: readonly T[], seed: string): T[] {
  const out = arr.slice();
  const rand = mulberry32(hashSeed(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Order a list for the given Israel day (defaults to today). */
export function orderForDay<T>(items: readonly T[], dayKey: string = israelDayKey()): T[] {
  return seededShuffle(items, dayKey);
}
