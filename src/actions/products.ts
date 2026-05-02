"use server";

import { adminDb, withTenantDb, schema } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getProducts(activeOnly = true) {
  const { tenantId } = await requireAdmin();
  if (activeOnly) {
    return adminDb
      .select()
      .from(schema.products)
      .where(
        and(eq(schema.products.tenantId, tenantId), eq(schema.products.isActive, true))
      );
  }
  return adminDb.select().from(schema.products).where(eq(schema.products.tenantId, tenantId));
}

export async function getProduct(id: number) {
  const { tenantId } = await requireAdmin();
  const rows = await adminDb
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.tenantId, tenantId), eq(schema.products.id, id)));
  return rows[0] ?? null;
}

export async function createProduct(formData: FormData) {
  const { tenantId } = await requireAdmin();

  const name = formData.get("name") as string;
  if (!name || !name.trim()) {
    throw new Error("Product name is required");
  }

  const defaultUnit = (formData.get("defaultUnit") as string) || "kg";
  const defaultRate = parseFloat(formData.get("defaultRate") as string) || 0;
  const hsnCode = (formData.get("hsnCode") as string) || null;
  const gstRatePercent =
    parseFloat(formData.get("gstRatePercent") as string) || 0;
  const category = (formData.get("category") as string) || null;

  await withTenantDb(tenantId, async (db) => {
    await db.insert(schema.products)
      .values({
        tenantId,
        name: name.trim(),
        defaultUnit,
        defaultRate,
        hsnCode,
        gstRatePercent,
        category,
      });
  });

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(id: number, formData: FormData) {
  const { tenantId } = await requireAdmin();

  const name = formData.get("name") as string;
  if (!name || !name.trim()) {
    throw new Error("Product name is required");
  }

  const defaultUnit = (formData.get("defaultUnit") as string) || "kg";
  const defaultRate = parseFloat(formData.get("defaultRate") as string) || 0;
  const hsnCode = (formData.get("hsnCode") as string) || null;
  const gstRatePercent =
    parseFloat(formData.get("gstRatePercent") as string) || 0;
  const category = (formData.get("category") as string) || null;

  await withTenantDb(tenantId, async (db) => {
    await db.update(schema.products)
      .set({
        name: name.trim(),
        defaultUnit,
        defaultRate,
        hsnCode,
        gstRatePercent,
        category,
      })
      .where(eq(schema.products.id, id));
  });

  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProducts(ids: number[]): Promise<{ deleted: number }> {
  if (!ids.length) return { deleted: 0 };
  const { tenantId } = await requireAdmin();

  await withTenantDb(tenantId, async (db) => {
    await db
      .update(schema.products)
      .set({ isActive: false })
      .where(
        and(
          eq(schema.products.tenantId, tenantId),
          inArray(schema.products.id, ids),
        ),
      );
  });

  revalidatePath("/products");
  return { deleted: ids.length };
}

export async function toggleProductActive(id: number) {
  const { tenantId } = await requireAdmin();

  await withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, id));
    const product = rows[0];

    if (!product) {
      throw new Error("Product not found");
    }

    await db.update(schema.products)
      .set({ isActive: !product.isActive })
      .where(eq(schema.products.id, id));
  });

  revalidatePath("/products");
}
