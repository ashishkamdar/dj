"use server";

import { adminDb, withTenantDb, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { requireAdmin, requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPayment(formData: FormData) {
  const user = await requireAdmin();
  const { tenantId } = user;

  const clientId = parseInt(formData.get("clientId") as string);
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const mode = formData.get("mode") as string;
  const notes = (formData.get("notes") as string) || "";

  if (!amount || amount <= 0) return { error: "Amount must be positive" };
  if (!date) return { error: "Date is required" };

  await withTenantDb(tenantId, async (db) => {
    await db.insert(schema.payments).values({
      tenantId,
      clientId,
      amount,
      date,
      mode: mode as "cash" | "upi" | "bank",
      notes,
      receivedBy: user.id,
    });
  });

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

export async function getPaymentsByClient(clientId: number) {
  const { tenantId } = await requireAuth();
  return adminDb.select().from(schema.payments)
    .where(and(eq(schema.payments.tenantId, tenantId), eq(schema.payments.clientId, clientId)));
}
