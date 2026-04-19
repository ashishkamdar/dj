import { db } from "./index";
import { firms, users, products } from "./schema";
import { hashSync } from "bcryptjs";

async function seed() {
  // Check if already seeded
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  // 1. Create default firm
  const [firm] = await db
    .insert(firms)
    .values({
      name: "DJ Foods",
      address: "Ahmedabad, Gujarat",
      phone: "9999999999",
      isGstRegistered: false,
    })
    .returning();
  console.log(`Created firm: ${firm.name} (id: ${firm.id})`);

  // 2. Create admin user
  const hashedPin = hashSync("1234", 10);
  const [admin] = await db
    .insert(users)
    .values({
      name: "Deepak",
      pin: hashedPin,
      role: "admin",
    })
    .returning();
  console.log(`Created admin user: ${admin.name} (id: ${admin.id})`);

  // 3. Create starter products
  const starterProducts = [
    { name: "Dhokla", defaultUnit: "kg", defaultRate: 180, category: "Snacks" },
    { name: "Patra", defaultUnit: "kg", defaultRate: 180, category: "Snacks" },
    { name: "Khandvi", defaultUnit: "kg", defaultRate: 180, category: "Snacks" },
    { name: "Kachori", defaultUnit: "kg", defaultRate: 200, category: "Snacks" },
    { name: "White Dhokla", defaultUnit: "kg", defaultRate: 180, category: "Snacks" },
  ];

  const insertedProducts = await db
    .insert(products)
    .values(starterProducts)
    .returning();

  for (const p of insertedProducts) {
    console.log(`Created product: ${p.name} @ ₹${p.defaultRate}/${p.defaultUnit}`);
  }

  console.log("\nSeed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
