// Short, URL-friendly, unguessable ids for public team pages.
// base62 over Web Crypto (works in Node and Vercel Fluid Compute).

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // 62 chars

// 8 chars of base62 ≈ 48 bits of entropy — plenty for unlisted capability URLs.
export function generateTeamId(len = 8): string {
  const out: string[] = [];
  while (out.length < len) {
    const bytes = crypto.getRandomValues(new Uint8Array(len));
    for (const b of bytes) {
      if (b < 248) out.push(ALPHABET[b % 62]); // reject the biased top bytes (248 = 62*4)
      if (out.length === len) break;
    }
  }
  return out.join('');
}
