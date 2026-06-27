'use client';

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;

/** Whether the email/password dev sign-in form should be offered. */
export const devCredentialsEnabled =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEV_CREDENTIALS === 'true';
