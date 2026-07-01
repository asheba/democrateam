import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth browser client for React islands. baseURL defaults to the current
 * window origin, which is correct for both dev and production.
 */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
