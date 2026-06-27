import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { feature, layer } from '@/lib/db/schema';
import { badRequest, getUser, notFound, unauthorized } from '@/lib/api';

const patchSchema = z.object({
  layerId: z.string().min(1).optional(),
  shape: z.string().optional(),
  geojson: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  // If moving to another layer, verify the caller owns the target layer.
  if (parsed.data.layerId) {
    const [owned] = await db
      .select({ id: layer.id })
      .from(layer)
      .where(and(eq(layer.id, parsed.data.layerId), eq(layer.userId, user.id)));
    if (!owned) return notFound();
  }

  const [updated] = await db
    .update(feature)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(feature.id, id), eq(feature.userId, user.id)))
    .returning();

  if (!updated) return notFound();
  return NextResponse.json({ feature: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const [deleted] = await db
    .delete(feature)
    .where(and(eq(feature.id, id), eq(feature.userId, user.id)))
    .returning({ id: feature.id });

  if (!deleted) return notFound();
  return NextResponse.json({ ok: true });
}
