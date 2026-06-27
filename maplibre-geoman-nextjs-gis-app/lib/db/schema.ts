import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Better Auth core tables. Shapes follow Better Auth's documented schema; keep
// column names in sync with `lib/auth.ts`. Run `pnpm db:generate` after edits.
// ---------------------------------------------------------------------------

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified')
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Application tables: per-user layers and the features inside them.
// ---------------------------------------------------------------------------

export const layer = pgTable(
  'layer',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#3b82f6'),
    borderColor: text('border_color').notNull().default('#1d4ed8'),
    visible: boolean('visible').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [index('layer_user_idx').on(t.userId)],
);

export const feature = pgTable(
  'feature',
  {
    // Geoman's feature id (stringified). Unique only per user — Geoman restarts
    // its counter each session — so the primary key is composite (userId, id).
    id: text('id').notNull(),
    layerId: text('layer_id')
      .notNull()
      .references(() => layer.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    shape: text('shape'),
    // Full GeoJSON Feature geometry+properties as stored/exported by Geoman.
    geojson: jsonb('geojson').notNull(),
    // The user-editable string→string metadata map.
    metadata: jsonb('metadata')
      .notNull()
      .$type<Record<string, string>>()
      .default({}),
    createdAt: timestamp('created_at')
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index('feature_layer_idx').on(t.layerId),
  ],
);

export type Layer = typeof layer.$inferSelect;
export type NewLayer = typeof layer.$inferInsert;
export type FeatureRow = typeof feature.$inferSelect;
export type NewFeatureRow = typeof feature.$inferInsert;
