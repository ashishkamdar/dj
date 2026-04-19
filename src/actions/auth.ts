"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { verifyPin } from "@/lib/auth";
import { setSession, clearSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function loginAction(pin: string): Promise<{ error?: string }> {
  const activeUsers = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.isActive, true))
    .all();

  for (const user of activeUsers) {
    if (verifyPin(pin, user.pin)) {
      await setSession(user.id);
      redirect("/calendar");
    }
  }

  return { error: "Invalid PIN" };
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
