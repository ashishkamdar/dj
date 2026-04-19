"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getProducts(activeOnly = true) {
  await requireAdmin();
  if (activeOnly) {
    return db
      .select()
      .from(schema.products)
      .where(eq(schema.products.isActive, true))
      .all();
  }
  return db.select().from(schema.products).all();
}

export async function getProduct(id: number) {
  await requireAdmin();
  return db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, id))
    .get();
}

export async function createProduct(formData: FormData) {
  await requireAdmin();

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

  db.insert(schema.products)
    .values({
      name: name.trim(),
      defaultUnit,
      defaultRate,
      hsnCode,
      gstRatePercent,
      category,
    })
    .run();

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(id: number, formData: FormData) {
  await requireAdmin();

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

  db.update(schema.products)
    .set({
      name: name.trim(),
      defaultUnit,
      defaultRate,
      hsnCode,
      gstRatePercent,
      category,
    })
    .where(eq(schema.products.id, id))
    .run();

  revalidatePath("/products");
  redirect("/products");
}

export async function toggleProductActive(id: number) {
  await requireAdmin();

  const product = db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, id))
    .get();

  if (!product) {
    throw new Error("Product not found");
  }

  db.update(schema.products)
    .set({ isActive: !product.isActive })
    .where(eq(schema.products.id, id))
    .run();

  revalidatePath("/products");
}
