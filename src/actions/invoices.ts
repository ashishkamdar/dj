"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { getClientBalance } from "@/lib/ledger";
import { revalidatePath } from "next/cache";

export async function createInvoice(formData: FormData) {
  const user = await requireAdmin();

  const orderId = parseInt(formData.get("orderId") as string);
  const size = (formData.get("size") as string) || "A4";

  // Get the order with items
  const order = db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).get();
  if (!order) return { error: "Order not found" };

  // Check if already invoiced
  const existing = db.select().from(schema.invoices).where(eq(schema.invoices.orderId, orderId)).get();
  if (existing) return { error: "Invoice already exists for this order" };

  // Get order items
  const items = db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId)).all();

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

  // Calculate GST if applicable — use firm's CGST/SGST rates
  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

  if (order.billingType === "gst") {
    const firm = db.select().from(schema.firms).where(eq(schema.firms.id, order.firmId)).get();
    if (firm && firm.isGstRegistered) {
      const firmCgst = firm.cgstPercent ?? 0;
      const firmSgst = firm.sgstPercent ?? 0;
      if (firmCgst > 0 || firmSgst > 0) {
        cgstAmount = (subtotal * firmCgst) / 100;
        sgstAmount = (subtotal * firmSgst) / 100;
      }
    }
  }

  const total = subtotal + cgstAmount + sgstAmount + igstAmount;

  // Get balance brought forward
  const balanceBf = getClientBalance(order.clientId);
  const grandTotal = total + balanceBf;

  // Generate invoice number
  const invoiceNumber = generateInvoiceNumber(order.firmId, order.date);

  // Create invoice
  db.insert(schema.invoices).values({
    invoiceNumber,
    orderId,
    firmId: order.firmId,
    clientId: order.clientId,
    date: order.date,
    subtotal,
    cgstAmount,
    sgstAmount,
    igstAmount,
    total,
    balanceBf,
    grandTotal,
    size: size as "A6" | "A4",
    createdBy: user.id,
  }).run();

  // Update order status to invoiced
  db.update(schema.orders)
    .set({ status: "invoiced", updatedAt: new Date().toISOString() })
    .where(eq(schema.orders.id, orderId))
    .run();

  revalidatePath(`/orders/${orderId}`);
  revalidatePath(`/calendar/${order.date}`);
}

export async function getInvoice(id: number) {
  return db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).get();
}

export async function getInvoiceByOrder(orderId: number) {
  return db.select().from(schema.invoices).where(eq(schema.invoices.orderId, orderId)).get();
}
