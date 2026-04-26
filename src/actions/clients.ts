"use server";

import { adminDb, withTenantDb, schema } from "@/db";
import { eq, and, or, like, desc } from "drizzle-orm";
import { requireAdmin, requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getClients(search?: string) {
  const { tenantId } = await requireAuth();

  if (search && search.trim()) {
    const pattern = `%${search.trim()}%`;
    return adminDb
      .select()
      .from(schema.clients)
      .where(
        and(
          eq(schema.clients.tenantId, tenantId),
          eq(schema.clients.isActive, true),
          or(
            like(schema.clients.shopName, pattern),
            like(schema.clients.ownerName, pattern)
          )
        )
      )
      .orderBy(desc(schema.clients.isRecurring));
  }

  return adminDb
    .select()
    .from(schema.clients)
    .where(and(eq(schema.clients.tenantId, tenantId), eq(schema.clients.isActive, true)))
    .orderBy(desc(schema.clients.isRecurring));
}

export async function getClient(id: number) {
  const { tenantId } = await requireAuth();
  const rows = await adminDb
    .select()
    .from(schema.clients)
    .where(and(eq(schema.clients.tenantId, tenantId), eq(schema.clients.id, id)));
  return rows[0] ?? null;
}

export async function createClient(formData: FormData) {
  const { tenantId } = await requireAdmin();

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

  await withTenantDb(tenantId, async (db) => {
    await db.insert(schema.clients)
      .values({
        tenantId,
        shopName: shopName.trim(),
        ownerName,
        phone,
        address,
        isRecurring,
        openingBalance,
        gstNumber,
      });
  });

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClient(id: number, formData: FormData) {
  const { tenantId } = await requireAdmin();

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

  await withTenantDb(tenantId, async (db) => {
    await db.update(schema.clients)
      .set({
        shopName: shopName.trim(),
        ownerName,
        phone,
        address,
        isRecurring,
        openingBalance,
        gstNumber,
      })
      .where(eq(schema.clients.id, id));
  });

  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}
