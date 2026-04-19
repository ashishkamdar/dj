"use server";

import { db, schema } from "@/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { requireAdmin, requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getOrderCountsByMonth(
  year: number,
  month: number,
): Promise<Record<string, number>> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const results = db
    .select({
      date: schema.orders.date,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(schema.orders)
    .where(
      and(
        gte(schema.orders.date, startDate),
        lte(schema.orders.date, endDate),
      ),
    )
    .groupBy(schema.orders.date)
    .all();

  const counts: Record<string, number> = {};
  for (const row of results) {
    counts[row.date] = row.count;
  }
  return counts;
}

export async function getOrdersByDate(date: string) {
  await requireAuth();

  const orders = db
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
    .where(eq(schema.orders.date, date))
    .all();

  // For each order, get items count and total
  const ordersWithTotals = orders.map((order) => {
    const itemsData = db
      .select({
        count: sql<number>`count(*)`.as("count"),
        total: sql<number>`coalesce(sum(${schema.orderItems.amount}), 0)`.as(
          "total",
        ),
      })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id))
      .get();

    const items = db
      .select({
        productName: schema.products.name,
        quantity: schema.orderItems.quantity,
        unit: schema.orderItems.unit,
      })
      .from(schema.orderItems)
      .leftJoin(
        schema.products,
        eq(schema.orderItems.productId, schema.products.id),
      )
      .where(eq(schema.orderItems.orderId, order.id))
      .all();

    return {
      ...order,
      itemsCount: itemsData?.count ?? 0,
      totalAmount: itemsData?.total ?? 0,
      items: items.map((i) => ({
        name: i.productName ?? "Unknown",
        quantity: i.quantity,
        unit: i.unit,
      })),
    };
  });

  return ordersWithTotals;
}

export async function getOrder(id: number) {
  await requireAuth();

  const order = db
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
    .where(eq(schema.orders.id, id))
    .get();

  if (!order) return null;

  const items = db
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
    .where(eq(schema.orderItems.orderId, id))
    .all();

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return { ...order, items, totalAmount };
}

export async function createOrder(formData: FormData) {
  const user = await requireAdmin();

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

  // Use a transaction
  const result = db.transaction((tx) => {
    const order = tx
      .insert(schema.orders)
      .values({
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
      .returning({ id: schema.orders.id })
      .get();

    for (const item of items) {
      tx.insert(schema.orderItems)
        .values({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.quantity * item.rate,
          updatedBy: user.id,
        })
        .run();
    }

    return order;
  });

  revalidatePath(`/calendar/${date}`);
  revalidatePath("/calendar");
  redirect(`/calendar/${date}`);
}

export async function updateOrder(id: number, formData: FormData) {
  const user = await requireAdmin();

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

  db.transaction((tx) => {
    tx.update(schema.orders)
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
      .where(eq(schema.orders.id, id))
      .run();

    // Delete old items and re-insert
    tx.delete(schema.orderItems)
      .where(eq(schema.orderItems.orderId, id))
      .run();

    for (const item of items) {
      tx.insert(schema.orderItems)
        .values({
          orderId: id,
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.quantity * item.rate,
          updatedBy: user.id,
        })
        .run();
    }
  });

  revalidatePath(`/calendar/${date}`);
  revalidatePath("/calendar");
  redirect(`/calendar/${date}`);
}

export async function deleteOrder(id: number) {
  await requireAdmin();

  const order = db
    .select({ date: schema.orders.date })
    .from(schema.orders)
    .where(eq(schema.orders.id, id))
    .get();

  if (!order) {
    throw new Error("Order not found");
  }

  db.transaction((tx) => {
    tx.delete(schema.orderItems)
      .where(eq(schema.orderItems.orderId, id))
      .run();
    tx.delete(schema.orders).where(eq(schema.orders.id, id)).run();
  });

  revalidatePath(`/calendar/${order.date}`);
  revalidatePath("/calendar");
  redirect(`/calendar/${order.date}`);
}
