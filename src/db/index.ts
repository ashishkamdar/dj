import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

// Admin DB — bypasses RLS (table owner without FORCE RLS)
// Use for: super-admin queries, session validation, login, seeding
export const adminDb = drizzle(pool, { schema });

// Tenant-aware DB — sets app.tenant_id so RLS kicks in
// Uses SET (session-level) + RESET at the end instead of BEGIN/COMMIT
// for fast reads. Wraps in transaction only when needed (inserts/updates).
export async function withTenantDb<T>(
  tenantId: number,
  fn: (db: NodePgDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query(`SET app.tenant_id = '${tenantId}'`);
    const db = drizzle(client, { schema });
    const result = await fn(db);
    return result;
  } finally {
    // Reset tenant context before returning connection to pool
    await client.query("RESET app.tenant_id").catch(() => {});
    client.release();
  }
}

export { schema };
export type TenantDb = NodePgDatabase<typeof schema>;
