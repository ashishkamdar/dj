"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPayment(formData: FormData) {
  const user = await requireAdmin();

  const clientId = parseInt(formData.get("clientId") as string);
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const mode = formData.get("mode") as string;
  const notes = (formData.get("notes") as string) || "";

  if (!amount || amount <= 0) return { error: "Amount must be positive" };
  if (!date) return { error: "Date is required" };

  db.insert(schema.payments).values({
    clientId,
    amount,
    date,
    mode: mode as "cash" | "upi" | "bank",
    notes,
    receivedBy: user.id,
  }).run();

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

export async function getPaymentsByClient(clientId: number) {
  return db.select().from(schema.payments)
    .where(eq(schema.payments.clientId, clientId))
    .all();
}
