import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { layer } from '@/lib/db/schema';
import { badRequest, getUser, notFound, unauthorized } from '@/lib/api';
import { layerSchemaShape, layerStyleShape } from '@/app/api/layers/route';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  color: hex.optional(),
  borderColor: hex.optional(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  schema: layerSchemaShape.optional(),
  style: layerStyleShape.optional(),
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

  const [updated] = await db
    .update(layer)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(layer.id, id), eq(layer.userId, user.id)))
    .returning();

  if (!updated) return notFound();
  return NextResponse.json({ layer: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const [deleted] = await db
    .delete(layer)
    .where(and(eq(layer.id, id), eq(layer.userId, user.id)))
    .returning({ id: layer.id });

  if (!deleted) return notFound();
  return NextResponse.json({ ok: true });
}
