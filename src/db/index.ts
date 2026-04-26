import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

// Admin DB — no RLS (for super-admin queries, migrations, seeding)
export const adminDb = drizzle(pool, { schema });

// Tenant-aware DB — sets app.tenant_id so RLS kicks in
export async function withTenantDb<T>(
  tenantId: number,
  fn: (db: NodePgDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
    const db = drizzle(client, { schema });
    const result = await fn(db);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export { schema };
export type TenantDb = NodePgDatabase<typeof schema>;
