"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getFirms() {
  await requireAdmin();
  return db.select().from(schema.firms).all();
}

export async function getFirm(id: number) {
  await requireAdmin();
  return db
    .select()
    .from(schema.firms)
    .where(eq(schema.firms.id, id))
    .get();
}

export async function createFirm(formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  if (!name || !name.trim()) {
    throw new Error("Firm name is required");
  }

  const address = (formData.get("address") as string) || "";
  const phone = (formData.get("phone") as string) || "";
  const email = (formData.get("email") as string) || null;
  const isGstRegistered = formData.get("isGstRegistered") === "on";
  const gstNumber = (formData.get("gstNumber") as string) || null;
  const stateCode = (formData.get("stateCode") as string) || null;
  const cgstPercent = parseFloat(formData.get("cgstPercent") as string) || 0;
  const sgstPercent = parseFloat(formData.get("sgstPercent") as string) || 0;
  const bankName = (formData.get("bankName") as string) || null;
  const bankAccount = (formData.get("bankAccount") as string) || null;
  const bankIfsc = (formData.get("bankIfsc") as string) || null;

  db.insert(schema.firms)
    .values({
      name: name.trim(),
      address,
      phone,
      email,
      isGstRegistered,
      gstNumber,
      stateCode,
      cgstPercent,
      sgstPercent,
      bankName,
      bankAccount,
      bankIfsc,
    })
    .run();

  revalidatePath("/settings/firms");
  redirect("/settings/firms");
}

export async function updateFirm(id: number, formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  if (!name || !name.trim()) {
    throw new Error("Firm name is required");
  }

  const address = (formData.get("address") as string) || "";
  const phone = (formData.get("phone") as string) || "";
  const email = (formData.get("email") as string) || null;
  const isGstRegistered = formData.get("isGstRegistered") === "on";
  const gstNumber = (formData.get("gstNumber") as string) || null;
  const stateCode = (formData.get("stateCode") as string) || null;
  const cgstPercent = parseFloat(formData.get("cgstPercent") as string) || 0;
  const sgstPercent = parseFloat(formData.get("sgstPercent") as string) || 0;
  const bankName = (formData.get("bankName") as string) || null;
  const bankAccount = (formData.get("bankAccount") as string) || null;
  const bankIfsc = (formData.get("bankIfsc") as string) || null;

  db.update(schema.firms)
    .set({
      name: name.trim(),
      address,
      phone,
      email,
      isGstRegistered,
      gstNumber,
      stateCode,
      cgstPercent,
      sgstPercent,
      bankName,
      bankAccount,
      bankIfsc,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.firms.id, id))
    .run();

  revalidatePath("/settings/firms");
  redirect("/settings/firms");
}
