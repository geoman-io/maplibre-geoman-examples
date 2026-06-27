import { NextResponse } from 'next/server';
import { getSession, type SessionUser } from '@/lib/auth';

/** Returns the signed-in user, or null. Route handlers turn null into a 401. */
export async function getUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export const badRequest = (detail: unknown) =>
  NextResponse.json({ error: 'Bad request', detail }, { status: 400 });

export const notFound = () =>
  NextResponse.json({ error: 'Not found' }, { status: 404 });
