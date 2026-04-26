"use server";

import { withTenantDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { hashPin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getUsers() {
  const { tenantId } = await requireAdmin();
  return withTenantDb(tenantId, async (db) => {
    return db.select().from(schema.users);
  });
}

export async function createUser(formData: FormData) {
  const { tenantId } = await requireAdmin();

  const name = formData.get("name") as string;
  if (!name || !name.trim()) {
    throw new Error("Name is required");
  }

  const pin = formData.get("pin") as string;
  if (!pin || pin.length < 4 || pin.length > 6) {
    throw new Error("PIN must be 4-6 digits");
  }

  const role = (formData.get("role") as string) || "staff";
  if (role !== "admin" && role !== "staff") {
    throw new Error("Invalid role");
  }

  await withTenantDb(tenantId, async (db) => {
    await db.insert(schema.users)
      .values({
        tenantId,
        name: name.trim(),
        pin: hashPin(pin),
        role: role as "admin" | "staff",
      });
  });

  revalidatePath("/settings/users");
}

export async function updateUser(id: number, formData: FormData) {
  const { tenantId } = await requireAdmin();

  const name = formData.get("name") as string;
  if (!name || !name.trim()) {
    throw new Error("Name is required");
  }

  const role = (formData.get("role") as string) || "staff";
  if (role !== "admin" && role !== "staff") {
    throw new Error("Invalid role");
  }

  const isActive = formData.get("isActive") === "on";

  await withTenantDb(tenantId, async (db) => {
    await db.update(schema.users)
      .set({
        name: name.trim(),
        role: role as "admin" | "staff",
        isActive,
      })
      .where(eq(schema.users.id, id));
  });

  revalidatePath("/settings/users");
}

export async function resetPin(id: number, formData: FormData) {
  const { tenantId } = await requireAdmin();

  const pin = formData.get("pin") as string;
  if (!pin || pin.length < 4 || pin.length > 6) {
    throw new Error("PIN must be 4-6 digits");
  }

  await withTenantDb(tenantId, async (db) => {
    await db.update(schema.users)
      .set({ pin: hashPin(pin) })
      .where(eq(schema.users.id, id));
  });

  revalidatePath("/settings/users");
}
