import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { layer } from '@/lib/db/schema';
import { badRequest, getUser, unauthorized } from '@/lib/api';

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const layers = await db
    .select()
    .from(layer)
    .where(eq(layer.userId, user.id))
    .orderBy(asc(layer.sortOrder), asc(layer.createdAt));

  return NextResponse.json({ layers });
}

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const finite = z.number().finite();
const int4 = z.number().int().min(-2_147_483_648).max(2_147_483_647);

export const layerSchemaShape = z
  .object({
    fields: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(60),
          type: z.enum(['string', 'number', 'integer', 'boolean', 'enum']),
          required: z.boolean().optional(),
          min: finite.optional(),
          max: finite.optional(),
          options: z
            .array(z.object({ value: z.string().max(120), label: z.string().max(120).optional() }))
            .max(50)
            .optional(),
        }),
      )
      .max(40),
  })
  .nullable();

// Presentation config (symbology / labels / filter) — a jsonb blob the client
// owns; bounded to the known keys, values left loose (round-trips to the same user).
export const layerStyleShape = z
  .object({
    symbology: z.any().optional(),
    labels: z.any().optional(),
    filter: z.any().optional(),
    minZoom: finite.min(0).max(24).optional(),
    maxZoom: finite.min(0).max(24).optional(),
  })
  .refine((style) => JSON.stringify(style).length <= 20_000, { message: 'Style is too large' })
  .nullable();

export const geometryTypeShape = z.enum(['point', 'line', 'polygon']).nullable();

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  color: hex.optional(),
  borderColor: hex.optional(),
  sortOrder: int4.optional(),
  schema: layerSchemaShape.optional(),
  geometryType: geometryTypeShape.optional(),
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return unauthorized();

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const [created] = await db
    .insert(layer)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      name: parsed.data.name,
      color: parsed.data.color ?? '#3b82f6',
      borderColor: parsed.data.borderColor ?? '#1d4ed8',
      sortOrder: parsed.data.sortOrder ?? 0,
      schema: parsed.data.schema ?? null,
      geometryType: parsed.data.geometryType ?? null,
    })
    .returning();

  return NextResponse.json({ layer: created }, { status: 201 });
}
