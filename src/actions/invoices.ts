"use server";

import { withTenantDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin, requireAuth } from "@/lib/session";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { getClientBalance } from "@/lib/ledger";
import { revalidatePath } from "next/cache";

export async function createInvoice(formData: FormData) {
  const user = await requireAdmin();
  const { tenantId } = user;

  const orderId = parseInt(formData.get("orderId") as string);
  const size = (formData.get("size") as string) || "A4";

  return withTenantDb(tenantId, async (db) => {
    // Get the order with items
    const orderRows = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    const order = orderRows[0];
    if (!order) return { error: "Order not found" };

    // Check if already invoiced
    const existingRows = await db.select().from(schema.invoices).where(eq(schema.invoices.orderId, orderId));
    if (existingRows[0]) return { error: "Invoice already exists for this order" };

    // Get order items
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

    // Calculate GST if applicable -- use firm's CGST/SGST rates
    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

    if (order.billingType === "gst") {
      const firmRows = await db.select().from(schema.firms).where(eq(schema.firms.id, order.firmId));
      const firm = firmRows[0];
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
    const balanceBf = await getClientBalance(tenantId, order.clientId);
    const grandTotal = total + balanceBf;

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(tenantId, order.firmId, order.date);

    // Create invoice
    await db.insert(schema.invoices).values({
      tenantId,
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
    });

    // Update order status to invoiced
    await db.update(schema.orders)
      .set({ status: "invoiced", updatedAt: new Date().toISOString() })
      .where(eq(schema.orders.id, orderId));

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/calendar/${order.date}`);
  });
}

export async function getInvoice(id: number) {
  const { tenantId } = await requireAuth();
  return withTenantDb(tenantId, async (db) => {
    const rows = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id));
    return rows[0] ?? null;
  });
}

export async function getInvoiceByOrder(orderId: number) {
  const { tenantId } = await requireAuth();
  return withTenantDb(tenantId, async (db) => {
    const rows = await db.select().from(schema.invoices).where(eq(schema.invoices.orderId, orderId));
    return rows[0] ?? null;
  });
}
