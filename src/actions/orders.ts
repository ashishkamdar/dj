"use server";

import { adminDb, withTenantDb, schema } from "@/db";
import { and, eq, gte, lte, sql, inArray } from "drizzle-orm";
import { requireAdmin, requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
