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

  // 3. Create products (no default rates — prices vary per client)
  const starterProducts = [
    "Khaman Dhokla",
    "Khandvi",
    "Stuff Khandvi",
    "Paneer Khandvi",
    "Cheese Khandvi",
    "Sandwich Khaman",
    "Paneer Khaman",
    "Cheese Khaman",
    "Dabeli Dhokla",
    "Pav Bhaji Dhokla",
    "White Dhokla",
    "Khatta Dhokla",
    "Sandwich Dhokla",
    "Tirangi Dhokla",
    "Falg Dhokla",
    "Sezwan Dhokla",
    "Kanchipuram Dhokla",
    "Corn Dhokla",
    "Corn Capsicum Dhokla",
    "Rumali Dhokla",
    "Garden Dhokla",
    "Watti Dhokla Yellow",
    "Watti Dhokla Garden",
    "Watti Dhokla White",
    "Mungdal Watti Dhokla",
    "Mungdal Dhokla",
    "Mini Idli White",
    "Mini Idli Masala",
    "Mini Idli Green",
    "Mungdal Mini Idli",
    "Kotmirwadi",
  ].map((name) => ({ name, defaultUnit: "kg" as const, defaultRate: 0 }));

  const insertedProducts = await db
    .insert(products)
    .values(starterProducts)
    .returning();

  for (const p of insertedProducts) {
    console.log(`Created product: ${p.name}`);
  }

  console.log(`\nSeed complete! ${insertedProducts.length} products created.`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
