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

/** A single feature can be a few megabytes. Anything larger is a request bomb. */
const MAX_BODY_BYTES = 8_000_000;

export function payloadTooLarge(req: Request): boolean {
  const length = Number(req.headers.get('content-length'));
  return Number.isFinite(length) && length > MAX_BODY_BYTES;
}

export const notFound = () =>
  NextResponse.json({ error: 'Not found' }, { status: 404 });
