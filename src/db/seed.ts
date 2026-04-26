import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { hashSync } from "bcryptjs";
import * as schema from "./schema";

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  // Check if already seeded
  const existingAdmins = await db.select().from(schema.superAdmins);
  if (existingAdmins.length > 0) {
    console.log("Database already seeded. Skipping.");
    await pool.end();
    return;
  }

  // 1. Create super admin
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@example.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "admin123";

  const [superAdmin] = await db
    .insert(schema.superAdmins)
    .values({
      name: "Ashish",
      email: email.toLowerCase(),
      password: hashSync(password, 10),
    })
    .returning();
  console.log(`Created super admin: ${superAdmin.email}`);

  // 2. Create Deepak's tenant
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      slug: "dj",
      name: "Kachaa Pakka",
      ownerName: "Deepak Jaiswal",
      ownerEmail: "deepak@example.com",
      ownerPhone: "9999999999",
      status: "active",
      subscriptionPlan: "free",
      subscriptionExpiresAt: null,
    })
    .returning();
  console.log(`Created tenant: ${tenant.name} (slug: ${tenant.slug})`);

  // 3. Map domain
  await db.insert(schema.tenantDomains).values({
    tenantId: tenant.id,
    domain: "dj.areakpi.in",
    isPrimary: true,
  });
  console.log("Mapped domain: dj.areakpi.in");

  // 4-6: Tenant-scoped inserts need app.tenant_id set for RLS
  const client = await pool.connect();
  await client.query("BEGIN");
  await client.query(`SET LOCAL app.tenant_id = '${tenant.id}'`);
  const tenantDb = drizzle(client, { schema });

  const [firm] = await tenantDb
    .insert(schema.firms)
    .values({
      tenantId: tenant.id,
      name: "Kachaa Pakka",
      address: "Ahmedabad, Gujarat",
      phone: "9999999999",
      isGstRegistered: false,
    })
    .returning();
  console.log(`Created firm: ${firm.name}`);

  const hashedPin = hashSync("1234", 10);
  const [user] = await tenantDb
    .insert(schema.users)
    .values({
      tenantId: tenant.id,
      name: "Deepak",
      pin: hashedPin,
      role: "admin",
    })
    .returning();
  console.log(`Created admin user: ${user.name} (PIN: 1234)`);

  const productNames = [
    "Khaman Dhokla", "Khandvi", "Stuff Khandvi", "Paneer Khandvi",
    "Cheese Khandvi", "Sandwich Khaman", "Paneer Khaman", "Cheese Khaman",
    "Dabeli Dhokla", "Pav Bhaji Dhokla", "White Dhokla", "Khatta Dhokla",
    "Sandwich Dhokla", "Tirangi Dhokla", "Falg Dhokla", "Sezwan Dhokla",
    "Kanchipuram Dhokla", "Corn Dhokla", "Corn Capsicum Dhokla",
    "Rumali Dhokla", "Garden Dhokla", "Watti Dhokla Yellow",
    "Watti Dhokla Garden", "Watti Dhokla White", "Mungdal Watti Dhokla",
    "Mungdal Dhokla", "Mini Idli White", "Mini Idli Masala",
    "Mini Idli Green", "Mungdal Mini Idli", "Kotmirwadi",
  ];

  await tenantDb.insert(schema.products).values(
    productNames.map((name) => ({
      tenantId: tenant.id,
      name,
      defaultUnit: "kg",
      defaultRate: 0,
    })),
  );
  console.log(`Created ${productNames.length} products`);

  await client.query("COMMIT");
  client.release();

  console.log("\nSeed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
