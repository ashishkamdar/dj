"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { hashPin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getUsers() {
  await requireAdmin();
  return db.select().from(schema.users).all();
}

export async function createUser(formData: FormData) {
  await requireAdmin();

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

  db.insert(schema.users)
    .values({
      name: name.trim(),
      pin: hashPin(pin),
      role: role as "admin" | "staff",
    })
    .run();

  revalidatePath("/settings/users");
}

export async function updateUser(id: number, formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  if (!name || !name.trim()) {
    throw new Error("Name is required");
  }

  const role = (formData.get("role") as string) || "staff";
  if (role !== "admin" && role !== "staff") {
    throw new Error("Invalid role");
  }

  const isActive = formData.get("isActive") === "on";

  db.update(schema.users)
    .set({
      name: name.trim(),
      role: role as "admin" | "staff",
      isActive,
    })
    .where(eq(schema.users.id, id))
    .run();

  revalidatePath("/settings/users");
}

export async function resetPin(id: number, formData: FormData) {
  await requireAdmin();

  const pin = formData.get("pin") as string;
  if (!pin || pin.length < 4 || pin.length > 6) {
    throw new Error("PIN must be 4-6 digits");
  }

  db.update(schema.users)
    .set({ pin: hashPin(pin) })
    .where(eq(schema.users.id, id))
    .run();

  revalidatePath("/settings/users");
}
