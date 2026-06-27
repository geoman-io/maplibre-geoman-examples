import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.');
}

// Reuse the pool across hot reloads / serverless invocations in the same runtime.
const globalForDb = globalThis as unknown as { __gisPool?: Pool };
const pool = globalForDb.__gisPool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== 'production') globalForDb.__gisPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
