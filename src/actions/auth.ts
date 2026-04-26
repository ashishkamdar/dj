"use server";

import { withTenantDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { verifyPin } from "@/lib/auth";
import { setSession, clearSession } from "@/lib/session";
import { resolveTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function loginAction(pin: string): Promise<{ error?: string }> {
  const headerList = await headers();
  const host = headerList.get("host") || "";
  const tenant = await resolveTenant(host);

  if (!tenant) return { error: "Unknown tenant" };
  if (tenant.status === "pending") return { error: "Account awaiting approval" };
  if (tenant.status === "suspended") return { error: "Account suspended" };

  const matched = await withTenantDb(tenant.id, async (db) => {
    const activeUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.isActive, true));

    for (const user of activeUsers) {
      if (verifyPin(pin, user.pin)) {
        return user;
      }
    }
    return null;
  });

  if (matched) {
    await setSession(tenant.id, matched.id);
    redirect("/calendar");
  }

  return { error: "Invalid PIN" };
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
