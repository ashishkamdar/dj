#!/usr/bin/env npx tsx
// Migration script: SQLite -> PostgreSQL
//
// Pre-requisites:
//   npm install better-sqlite3 (temporary, for migration only)
//
// Usage:
//   DATABASE_URL=postgres://... npx tsx scripts/migrate-sqlite-to-pg.ts [sqlite-path] [tenant-slug] [domain]
//
// Defaults:
//   sqlite-path: ./data/dj.db
//   tenant-slug: dj
//   domain: dj.areakpi.in

import Database from "better-sqlite3";
import { Pool } from "pg";
import path from "path";

const SQLITE_PATH =
  process.argv[2] || path.join(process.cwd(), "data", "dj.db");
const TENANT_SLUG = process.argv[3] || "dj";
const DOMAIN = process.argv[4] || "dj.areakpi.in";

async function migrate() {
  console.log(
    `Migrating SQLite (${SQLITE_PATH}) -> PG tenant "${TENANT_SLUG}"...`,
  );

  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if tenant already exists
    const existing = await client.query(
      "SELECT id FROM tenants WHERE slug = $1",
      [TENANT_SLUG],
    );
    if (existing.rows.length > 0) {
      console.log(`Tenant "${TENANT_SLUG}" already exists. Skipping.`);
      await client.query("ROLLBACK");
      return;
    }

    // Create tenant
    const {
      rows: [tenant],
    } = await client.query(
      `INSERT INTO tenants (slug, name, owner_name, owner_email, owner_phone, status, subscription_plan)
       VALUES ($1, 'Kachaa Pakka', 'Deepak Jaiswal', 'deepak@example.com', '9999999999', 'active', 'free')
       RETURNING id`,
      [TENANT_SLUG],
    );
    const tenantId = tenant.id;
    console.log(`Created tenant id=${tenantId}`);

    // Map domain
    await client.query(
      "INSERT INTO tenant_domains (tenant_id, domain, is_primary) VALUES ($1, $2, true)",
      [tenantId, DOMAIN],
    );
    console.log(`Mapped domain: ${DOMAIN}`);

    // Migrate tables in FK order
    // For each table: read all rows from SQLite, insert into PG with tenant_id added
    const tables = [
      "firms",
      "users",
      "products",
      "clients",
      "orders",
      "order_items",
      "invoices",
      "payments",
    ];

    for (const table of tables) {
      const rows = sqlite
        .prepare(`SELECT * FROM ${table}`)
        .all() as Record<string, unknown>[];
      if (rows.length === 0) {
        console.log(`  ${table}: 0 rows (empty)`);
        continue;
      }

      for (const row of rows) {
        const cols = Object.keys(row);
        const pgCols = [...cols, "tenant_id"];
        const placeholders = pgCols.map((_, i) => `$${i + 1}`).join(", ");
        const values = [...cols.map((c) => row[c]), tenantId];

        await client.query(
          `INSERT INTO ${table} (${pgCols.join(", ")}) VALUES (${placeholders})`,
          values,
        );
      }

      // Reset sequence to max(id) + 1
      const maxId = Math.max(...rows.map((r) => r.id as number));
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), $1)`,
        [maxId],
      );

      console.log(`  ${table}: ${rows.length} rows migrated`);
    }

    await client.query("COMMIT");
    console.log("\nMigration complete!");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
