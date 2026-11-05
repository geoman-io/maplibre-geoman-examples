import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { feature, layer } from '@/lib/db/schema';
import { badRequest, getUser, notFound, unauthorized } from '@/lib/api';
import { geometryProblem, MAX_ID_LENGTH } from '@/lib/geojson-guard';

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return unauthorized();

  const layerId = new URL(req.url).searchParams.get('layerId');
  const where = layerId
    ? and(eq(feature.userId, user.id), eq(feature.layerId, layerId))
    : eq(feature.userId, user.id);

  const features = await db.select().from(feature).where(where);
  return NextResponse.json({ features });
}

const idSchema = z.string().trim().min(1).max(MAX_ID_LENGTH);
const metadataSchema = z.record(z.string().max(120), z.string().max(2000)).optional();
const geojsonSchema = z
  .object({
    type: z.literal('Feature'),
    geometry: z.unknown(),
    properties: z.unknown().optional(),
  })
  .refine((feature) => geometryProblem(feature.geometry) === null, {
    message: 'Geometry is empty, non-finite, or not a drawable shape',
  });

const upsertSchema = z.object({
  id: idSchema,
  layerId: idSchema,
  shape: z.string().max(40).optional(),
  geojson: geojsonSchema,
  metadata: metadataSchema,
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return unauthorized();

  const parsed = upsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const data = parsed.data;

  // Ensure the target layer belongs to the caller before writing.
  const [owned] = await db
    .select({ id: layer.id })
    .from(layer)
    .where(and(eq(layer.id, data.layerId), eq(layer.userId, user.id)));
  if (!owned) return notFound();

  const [saved] = await db
    .insert(feature)
    .values({
      id: data.id,
      layerId: data.layerId,
      userId: user.id,
      shape: data.shape,
      geojson: data.geojson,
      metadata: data.metadata ?? {},
    })
    .onConflictDoUpdate({
      target: [feature.userId, feature.id],
      set: {
        layerId: data.layerId,
        shape: data.shape,
        geojson: data.geojson,
        ...(data.metadata ? { metadata: data.metadata } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({ feature: saved }, { status: 201 });
}
