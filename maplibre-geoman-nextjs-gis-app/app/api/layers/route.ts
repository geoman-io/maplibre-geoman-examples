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
      .max(40)
      .refine((fields) => new Set(fields.map((field) => field.name)).size === fields.length, {
        message: 'Field names must be unique',
      }),
  })
  .nullable();

// Presentation config. Kept to known shapes so a saved style cannot crash
// hydrate or produce a MapLibre expression the renderer rejects.
const filterShape = z.object({
  field: z.string().trim().min(1).max(60),
  op: z.enum(['=', '!=', '>', '>=', '<', '<=', 'contains']),
  value: z.string().max(2000),
});

const symbologyShape = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('single') }),
  z.object({
    mode: z.literal('categorized'),
    field: z.string().trim().min(1).max(60),
    categories: z.array(z.object({ value: z.string().max(200), color: hex })).max(100),
    fallback: hex,
  }),
  z.object({
    mode: z.literal('graduated'),
    field: z.string().trim().min(1).max(60),
    base: hex,
    stops: z.array(z.object({ value: finite, color: hex })).max(24),
  }),
]);

export const layerStyleShape = z
  .object({
    symbology: symbologyShape.optional(),
    labels: z
      .object({
        field: z.string().trim().min(1).max(60),
        size: finite.min(1).max(64).optional(),
        color: hex.optional(),
        haloColor: hex.optional(),
      })
      .optional(),
    filter: filterShape.optional(),
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
