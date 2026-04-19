"use server";

import { db, schema } from "@/db";
import { eq, and, or, like, desc } from "drizzle-orm";
import { requireAdmin, requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getClients(search?: string) {
  await requireAuth();

  let query = db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.isActive, true))
    .orderBy(desc(schema.clients.isRecurring));

  if (search && search.trim()) {
    const pattern = `%${search.trim()}%`;
    query = db
      .select()
      .from(schema.clients)
      .where(
        and(
          eq(schema.clients.isActive, true),
          or(
            like(schema.clients.shopName, pattern),
            like(schema.clients.ownerName, pattern)
          )
        )
      )
      .orderBy(desc(schema.clients.isRecurring));
  }

  return query.all();
}

export async function getClient(id: number) {
  await requireAuth();
  return db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.id, id))
    .get();
}

export async function createClient(formData: FormData) {
  await requireAdmin();

  const shopName = formData.get("shopName") as string;
  if (!shopName || !shopName.trim()) {
    throw new Error("Shop name is required");
  }

  const ownerName = (formData.get("ownerName") as string) || "";
  const phone = (formData.get("phone") as string) || "";
  const address = (formData.get("address") as string) || "";
  const isRecurring = formData.get("isRecurring") === "on";
  const openingBalance =
    parseFloat(formData.get("openingBalance") as string) || 0;
  const gstNumber = (formData.get("gstNumber") as string) || null;

  db.insert(schema.clients)
    .values({
      shopName: shopName.trim(),
      ownerName,
      phone,
      address,
      isRecurring,
      openingBalance,
      gstNumber,
    })
    .run();

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClient(id: number, formData: FormData) {
  await requireAdmin();

  const shopName = formData.get("shopName") as string;
  if (!shopName || !shopName.trim()) {
    throw new Error("Shop name is required");
  }

  const ownerName = (formData.get("ownerName") as string) || "";
  const phone = (formData.get("phone") as string) || "";
  const address = (formData.get("address") as string) || "";
  const isRecurring = formData.get("isRecurring") === "on";
  const openingBalance =
    parseFloat(formData.get("openingBalance") as string) || 0;
  const gstNumber = (formData.get("gstNumber") as string) || null;

  db.update(schema.clients)
    .set({
      shopName: shopName.trim(),
      ownerName,
      phone,
      address,
      isRecurring,
      openingBalance,
      gstNumber,
    })
    .where(eq(schema.clients.id, id))
    .run();

  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}
