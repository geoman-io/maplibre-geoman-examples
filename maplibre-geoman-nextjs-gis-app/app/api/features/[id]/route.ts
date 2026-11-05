import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { feature, layer } from '@/lib/db/schema';
import { badRequest, getUser, notFound, unauthorized } from '@/lib/api';
import { geometryFits, geometryProblem, MAX_ID_LENGTH } from '@/lib/geojson-guard';

const patchSchema = z.object({
  layerId: z.string().trim().min(1).max(MAX_ID_LENGTH).optional(),
  shape: z.string().max(40).optional(),
  geojson: z
    .object({
      type: z.literal('Feature'),
      geometry: z.unknown(),
      properties: z.unknown().optional(),
    })
    .refine((feature) => geometryProblem(feature.geometry) === null, {
      message: 'Geometry is empty, non-finite, or not a drawable shape',
    })
    .optional(),
  metadata: z
    .record(z.string().max(120), z.string().max(2000))
    .refine((metadata) => Object.keys(metadata).length <= 100, { message: 'Too many attributes' })
    .optional(),
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
  const targetLayerId = parsed.data.layerId;
  if (targetLayerId || parsed.data.geojson) {
    const [current] = await db
      .select({ layerId: feature.layerId })
      .from(feature)
      .where(and(eq(feature.id, id), eq(feature.userId, user.id)));
    const layerId = targetLayerId ?? current?.layerId;
    if (layerId) {
      const [owned] = await db
        .select({ id: layer.id, geometryType: layer.geometryType })
        .from(layer)
        .where(and(eq(layer.id, layerId), eq(layer.userId, user.id)));
      if (!owned) return notFound();
      if (parsed.data.geojson && !geometryFits(owned.geometryType, parsed.data.geojson.geometry)) {
        return badRequest('Geometry does not match the layer');
      }
    }
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
