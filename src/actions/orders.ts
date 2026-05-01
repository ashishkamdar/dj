"use server";

import { adminDb, withTenantDb, schema } from "@/db";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { requireAdmin, requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type OrderListFilters = {
  from?: string;
  to?: string;
  clientId?: number;
  firmId?: number;
  billingType?: "gst" | "non-gst" | "catering";
  status?: "draft" | "confirmed" | "invoiced";
  q?: string;
};

export type OrderListRow = {
  id: number;
  date: string;
  clientId: number;
  shopName: string | null;
  firmName: string | null;
  billingType: string;
  status: string | null;
  eventName: string | null;
  itemsCount: number;
  total: number;
  isInvoiced: boolean;
  isPaid: boolean;
  paidAmount: number;
};

export async function listOrders(
  filters: OrderListFilters,
): Promise<OrderListRow[]> {
  const { tenantId } = await requireAuth();

  const where = [eq(schema.orders.tenantId, tenantId)];
  if (filters.from) where.push(gte(schema.orders.date, filters.from));
  if (filters.to) where.push(lte(schema.orders.date, filters.to));
  if (filters.clientId) where.push(eq(schema.orders.clientId, filters.clientId));
  if (filters.firmId) where.push(eq(schema.orders.firmId, filters.firmId));
  if (filters.billingType)
    where.push(eq(schema.orders.billingType, filters.billingType));
  if (filters.status) where.push(eq(schema.orders.status, filters.status));
  if (filters.q && filters.q.trim()) {
    const pattern = `%${filters.q.trim()}%`;
    where.push(
      or(
        ilike(schema.clients.shopName, pattern),
        ilike(schema.orders.eventName, pattern),
      )!,
    );
  }

  const rows = await adminDb
    .select({
      id: schema.orders.id,
      date: schema.orders.date,
      clientId: schema.orders.clientId,
      billingType: schema.orders.billingType,
      status: schema.orders.status,
      eventName: schema.orders.eventName,
      shopName: schema.clients.shopName,
      firmName: schema.firms.name,
      invoiceTotal: schema.invoices.grandTotal,
    })
    .from(schema.orders)
    .leftJoin(schema.clients, eq(schema.orders.clientId, schema.clients.id))
    .leftJoin(schema.firms, eq(schema.orders.firmId, schema.firms.id))
    .leftJoin(schema.invoices, eq(schema.invoices.orderId, schema.orders.id))
    .where(and(...where))
    .orderBy(desc(schema.orders.date), desc(schema.orders.id))
    .limit(1000);

  if (rows.length === 0) return [];

  const orderIds = rows.map((r) => r.id);
  const [itemAgg, paymentAgg] = await Promise.all([
    adminDb
      .select({
        orderId: schema.orderItems.orderId,
        itemsCount: sql<number>`count(*)`.as("items_count"),
        subtotal: sql<number>`coalesce(sum(${schema.orderItems.amount}), 0)`.as(
          "subtotal",
        ),
      })
      .from(schema.orderItems)
      .where(inArray(schema.orderItems.orderId, orderIds))
      .groupBy(schema.orderItems.orderId),
    adminDb
      .select({
        orderId: schema.payments.orderId,
        paid: sql<number>`coalesce(sum(${schema.payments.amount}), 0)`.as(
          "paid",
        ),
      })
      .from(schema.payments)
      .where(inArray(schema.payments.orderId, orderIds))
      .groupBy(schema.payments.orderId),
  ]);

  const paidByOrder = new Map<number, number>();
  for (const p of paymentAgg) {
    if (p.orderId != null) paidByOrder.set(p.orderId, Number(p.paid));
  }

  const aggByOrder = new Map<number, { itemsCount: number; subtotal: number }>();
  for (const a of itemAgg) {
    aggByOrder.set(a.orderId, {
      itemsCount: Number(a.itemsCount),
      subtotal: Number(a.subtotal),
    });
  }

  return rows.map((r) => {
    const agg = aggByOrder.get(r.id) ?? { itemsCount: 0, subtotal: 0 };
    const isInvoiced = r.invoiceTotal != null;
    const total = isInvoiced ? Number(r.invoiceTotal) : agg.subtotal;
    const paidAmount = paidByOrder.get(r.id) ?? 0;
    // Treat as paid if recorded payments cover at least the order total
    // (rounding tolerance of 1 paisa).
    const isPaid = total > 0 && paidAmount + 0.01 >= total;
    return {
      id: r.id,
      date: r.date,
      clientId: r.clientId,
      shopName: r.shopName,
      firmName: r.firmName,
      billingType: r.billingType,
      status: r.status,
      eventName: r.eventName,
      itemsCount: agg.itemsCount,
      total,
      isInvoiced,
      isPaid,
      paidAmount,
    };
  });
}

export async function markOrderPaid(orderId: number, paid: boolean) {
  const user = await requireAdmin();
  const { tenantId } = user;

  const orderRows = await adminDb
    .select({
      id: schema.orders.id,
      clientId: schema.orders.clientId,
      date: schema.orders.date,
    })
    .from(schema.orders)
    .where(and(eq(schema.orders.tenantId, tenantId), eq(schema.orders.id, orderId)));
  const order = orderRows[0];
  if (!order) throw new Error("Order not found");

  if (paid) {
    // Compute order total: prefer invoice grand total, else item subtotal.
    const invoiceRows = await adminDb
      .select({ grandTotal: schema.invoices.grandTotal })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.tenantId, tenantId),
          eq(schema.invoices.orderId, orderId),
        ),
      );
    let total: number;
    if (invoiceRows[0]) {
      total = invoiceRows[0].grandTotal;
    } else {
      const itemRows = await adminDb
        .select({ amount: schema.orderItems.amount })
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, orderId));
      total = itemRows.reduce((s, i) => s + i.amount, 0);
    }

    if (total <= 0) throw new Error("Order has no amount to mark as paid");

    // Already-paid amount on this order
    const existingRows = await adminDb
      .select({ amount: schema.payments.amount })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.tenantId, tenantId),
          eq(schema.payments.orderId, orderId),
        ),
      );
    const alreadyPaid = existingRows.reduce((s, p) => s + p.amount, 0);
    const remaining = total - alreadyPaid;
    if (remaining <= 0.01) {
      // Already covered — nothing to insert.
      revalidatePath("/orders");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    await withTenantDb(tenantId, async (db) => {
      await db.insert(schema.payments).values({
        tenantId,
        clientId: order.clientId,
        orderId,
        amount: remaining,
        date: today,
        mode: "cash",
        notes: `Marked paid from orders list`,
        receivedBy: user.id,
      });
    });
  } else {
    // Remove all payments tied to this order.
    await withTenantDb(tenantId, async (db) => {
      await db
        .delete(schema.payments)
        .where(
          and(
            eq(schema.payments.tenantId, tenantId),
            eq(schema.payments.orderId, orderId),
          ),
        );
    });
  }

  revalidatePath("/orders");
  revalidatePath("/analytics");
  revalidatePath(`/clients/${order.clientId}`);
  revalidatePath(`/calendar/${order.date}`);
}

export async function getOrderCountsByMonth(
  year: number,
  month: number,
): Promise<Record<string, number>> {
  const { tenantId } = await requireAuth();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const results = await adminDb
    .select({
      date: schema.orders.date,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        gte(schema.orders.date, startDate),
        lte(schema.orders.date, endDate),
      ),
    )
    .groupBy(schema.orders.date);

  const counts: Record<string, number> = {};
  for (const row of results) {
    counts[row.date] = row.count;
  }
  return counts;
}

export async function getOrdersByDate(date: string) {
  const { tenantId } = await requireAuth();

  const orders = await adminDb
    .select({
      id: schema.orders.id,
      date: schema.orders.date,
      clientId: schema.orders.clientId,
      firmId: schema.orders.firmId,
      billingType: schema.orders.billingType,
      status: schema.orders.status,
      notes: schema.orders.notes,
      eventDate: schema.orders.eventDate,
      eventName: schema.orders.eventName,
      advancePaid: schema.orders.advancePaid,
      createdAt: schema.orders.createdAt,
      shopName: schema.clients.shopName,
    })
    .from(schema.orders)
    .leftJoin(schema.clients, eq(schema.orders.clientId, schema.clients.id))
    .where(and(eq(schema.orders.tenantId, tenantId), eq(schema.orders.date, date)));

  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);

  // Fetch ALL items for ALL orders in ONE query (fixes N+1)
  const allItems = await adminDb
    .select({
      orderId: schema.orderItems.orderId,
      productName: schema.products.name,
      quantity: schema.orderItems.quantity,
      unit: schema.orderItems.unit,
      amount: schema.orderItems.amount,
    })
    .from(schema.orderItems)
    .leftJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
    .where(inArray(schema.orderItems.orderId, orderIds));

  // Group items by orderId
  const itemsByOrder = new Map<number, typeof allItems>();
  for (const item of allItems) {
    const arr = itemsByOrder.get(item.orderId) ?? [];
    arr.push(item);
    itemsByOrder.set(item.orderId, arr);
  }

  return orders.map((order) => {
    const items = itemsByOrder.get(order.id) ?? [];
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    return {
      ...order,
      itemsCount: items.length,
      totalAmount,
      items: items.map((i) => ({
        name: i.productName ?? "Unknown",
        quantity: i.quantity,
        unit: i.unit,
      })),
    };
  });
}

export async function getOrder(id: number) {
  const { tenantId } = await requireAuth();

  const rows = await adminDb
    .select({
      id: schema.orders.id,
      date: schema.orders.date,
      clientId: schema.orders.clientId,
      firmId: schema.orders.firmId,
      billingType: schema.orders.billingType,
      status: schema.orders.status,
      notes: schema.orders.notes,
      eventDate: schema.orders.eventDate,
      eventName: schema.orders.eventName,
      advancePaid: schema.orders.advancePaid,
      createdBy: schema.orders.createdBy,
      createdAt: schema.orders.createdAt,
      shopName: schema.clients.shopName,
      ownerName: schema.clients.ownerName,
      clientPhone: schema.clients.phone,
      firmName: schema.firms.name,
    })
    .from(schema.orders)
    .leftJoin(schema.clients, eq(schema.orders.clientId, schema.clients.id))
    .leftJoin(schema.firms, eq(schema.orders.firmId, schema.firms.id))
    .where(and(eq(schema.orders.tenantId, tenantId), eq(schema.orders.id, id)));

  const order = rows[0] ?? null;
  if (!order) return null;

  const items = await adminDb
    .select({
      id: schema.orderItems.id,
      productId: schema.orderItems.productId,
      quantity: schema.orderItems.quantity,
      unit: schema.orderItems.unit,
      rate: schema.orderItems.rate,
      amount: schema.orderItems.amount,
      itemStatus: schema.orderItems.itemStatus,
      productName: schema.products.name,
    })
    .from(schema.orderItems)
    .leftJoin(
      schema.products,
      eq(schema.orderItems.productId, schema.products.id),
    )
    .where(eq(schema.orderItems.orderId, id));

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return { ...order, items, totalAmount };
}

export async function createOrder(formData: FormData) {
  const user = await requireAdmin();
  const { tenantId } = user;

  const date = formData.get("date") as string;
  const clientId = parseInt(formData.get("clientId") as string, 10);
  const firmId = parseInt(formData.get("firmId") as string, 10);
  const billingType = formData.get("billingType") as
    | "gst"
    | "non-gst"
    | "catering";
  const status = (formData.get("status") as string) || "draft";
  const notes = (formData.get("notes") as string) || null;
  const eventDate = (formData.get("eventDate") as string) || null;
  const eventName = (formData.get("eventName") as string) || null;
  const advancePaid =
    parseFloat(formData.get("advancePaid") as string) || 0;
  const itemsJson = formData.get("items") as string;

  if (!date || !clientId || !firmId || !billingType) {
    throw new Error("Missing required fields");
  }

  const items = JSON.parse(itemsJson) as Array<{
    productId: number;
    quantity: number;
    unit: string;
    rate: number;
  }>;

  if (!items.length) {
    throw new Error("At least one item is required");
  }

  await withTenantDb(tenantId, async (db) => {
    const orderRows = await db
      .insert(schema.orders)
      .values({
        tenantId,
        date,
        clientId,
        firmId,
        billingType,
        status: status as "draft" | "confirmed" | "invoiced",
        notes,
        eventDate: eventDate || undefined,
        eventName: eventName || undefined,
        advancePaid,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: schema.orders.id });
    const order = orderRows[0];

    // Batch insert all items at once
    await db.insert(schema.orderItems).values(
      items.map((item) => ({
        tenantId,
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.quantity * item.rate,
        updatedBy: user.id,
      }))
    );
  });

  revalidatePath(`/calendar/${date}`);
  revalidatePath("/calendar");
  redirect(`/calendar/${date}`);
}

export async function updateOrder(id: number, formData: FormData) {
  const user = await requireAdmin();
  const { tenantId } = user;

  const date = formData.get("date") as string;
  const clientId = parseInt(formData.get("clientId") as string, 10);
  const firmId = parseInt(formData.get("firmId") as string, 10);
  const billingType = formData.get("billingType") as
    | "gst"
    | "non-gst"
    | "catering";
  const status = (formData.get("status") as string) || "draft";
  const notes = (formData.get("notes") as string) || null;
  const eventDate = (formData.get("eventDate") as string) || null;
  const eventName = (formData.get("eventName") as string) || null;
  const advancePaid =
    parseFloat(formData.get("advancePaid") as string) || 0;
  const itemsJson = formData.get("items") as string;

  if (!date || !clientId || !firmId || !billingType) {
    throw new Error("Missing required fields");
  }

  const items = JSON.parse(itemsJson) as Array<{
    productId: number;
    quantity: number;
    unit: string;
    rate: number;
  }>;

  if (!items.length) {
    throw new Error("At least one item is required");
  }

  await withTenantDb(tenantId, async (db) => {
    await db.update(schema.orders)
      .set({
        date,
        clientId,
        firmId,
        billingType,
        status: status as "draft" | "confirmed" | "invoiced",
        notes,
        eventDate: eventDate || undefined,
        eventName: eventName || undefined,
        advancePaid,
        updatedBy: user.id,
      })
      .where(eq(schema.orders.id, id));

    // Delete old items and re-insert
    await db.delete(schema.orderItems)
      .where(eq(schema.orderItems.orderId, id));

    // Batch insert all items at once
    await db.insert(schema.orderItems).values(
      items.map((item) => ({
        tenantId,
        orderId: id,
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.quantity * item.rate,
        updatedBy: user.id,
      }))
    );
  });

  revalidatePath(`/calendar/${date}`);
  revalidatePath("/calendar");
  redirect(`/calendar/${date}`);
}

export async function deleteOrder(id: number) {
  const { tenantId } = await requireAdmin();

  const orderDate = await withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select({ date: schema.orders.date })
      .from(schema.orders)
      .where(eq(schema.orders.id, id));
    const order = rows[0];

    if (!order) {
      throw new Error("Order not found");
    }

    await db.delete(schema.orderItems)
      .where(eq(schema.orderItems.orderId, id));
    await db.delete(schema.orders).where(eq(schema.orders.id, id));

    return order.date;
  });

  revalidatePath(`/calendar/${orderDate}`);
  revalidatePath("/calendar");
  redirect(`/calendar/${orderDate}`);
}
