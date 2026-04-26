import { Pool } from "pg";

const TENANT_TABLES = [
  "firms",
  "users",
  "products",
  "clients",
  "orders",
  "order_items",
  "invoices",
  "payments",
];

async function setupRLS() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  try {
    for (const table of TENANT_TABLES) {
      console.log(`Setting up RLS for ${table}...`);
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      // Note: we do NOT use FORCE ROW LEVEL SECURITY here.
      // The table owner (kachaapakka_app) can bypass RLS for admin queries.
      // Tenant isolation is enforced by withTenantDb() which sets app.tenant_id.
      await client.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
      await client.query(`DROP POLICY IF EXISTS tenant_isolation ON ${table}`);
      await client.query(`
        CREATE POLICY tenant_isolation ON ${table}
          USING (tenant_id = current_setting('app.tenant_id', true)::int)
          WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)
      `);
    }
    console.log("RLS setup complete for all tenant tables.");
  } finally {
    client.release();
    await pool.end();
  }
}

setupRLS().catch((err) => {
  console.error("RLS setup failed:", err);
  process.exit(1);
});
