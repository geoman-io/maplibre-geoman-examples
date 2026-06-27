import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { account, session, user, verification } from '@/lib/db/schema';

// Email/password is enabled outside production (or when explicitly opted in) so
// local dev and e2e tests can authenticate without the GitHub OAuth browser flow.
export const devCredentialsEnabled =
  process.env.NODE_ENV !== 'production' ||
  process.env.ENABLE_DEV_CREDENTIALS === 'true';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  emailAndPassword: { enabled: devCredentialsEnabled },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    },
  },
});

/** Server-side session lookup for route handlers and server components. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getSession>>
>['user'];
