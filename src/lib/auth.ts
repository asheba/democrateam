import { betterAuth } from 'better-auth';
import { LibsqlDialect } from '@libsql/kysely-libsql';

/**
 * Better Auth server. Reuses the same libSQL/Turso database as `db.ts` via the
 * Kysely libSQL dialect, so auth tables (user/session/account/verification) live
 * alongside the app's `teams` table. In dev (no env vars) it points at the same
 * local `file:local.db`.
 *
 * Env is read from both `process.env` (populated on Vercel) and `import.meta.env`
 * (how Astro exposes `.env` during `astro dev`), so credentials resolve in both.
 */
const metaEnv = import.meta.env as unknown as Record<string, string | undefined>;
const env = (key: string): string | undefined => process.env[key] ?? metaEnv[key];

const url = env('TURSO_DATABASE_URL') ?? 'file:local.db';
const authToken = env('TURSO_AUTH_TOKEN');

export const auth = betterAuth({
  appName: 'Democrateam',
  baseURL: env('BETTER_AUTH_URL'),
  secret: env('BETTER_AUTH_SECRET'),
  trustedOrigins: ['http://localhost:4321', 'https://ildemocra.team'],
  database: {
    dialect: new LibsqlDialect(authToken ? { url, authToken } : { url }),
    type: 'sqlite',
  },
  session: {
    // Effectively never log out: ~1 year expiry, refreshed weekly on activity.
    expiresIn: 60 * 60 * 24 * 365,
    updateAge: 60 * 60 * 24 * 7,
    cookieCache: { enabled: true, maxAge: 60 * 60 * 24 },
  },
  socialProviders: {
    google: {
      clientId: env('GOOGLE_CLIENT_ID') as string,
      clientSecret: env('GOOGLE_CLIENT_SECRET') as string,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
