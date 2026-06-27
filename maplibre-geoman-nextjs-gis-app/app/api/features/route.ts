import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { feature, layer } from '@/lib/db/schema';
import { badRequest, getUser, notFound, unauthorized } from '@/lib/api';

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

const upsertSchema = z.object({
  id: z.string().min(1),
  layerId: z.string().min(1),
  shape: z.string().optional(),
  geojson: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.string()).optional(),
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
