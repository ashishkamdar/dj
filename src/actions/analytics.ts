"use server";

import { adminDb, schema } from "@/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { getClientBalance } from "@/lib/ledger";

export interface DailySummary {
  totalOrders: number;
  totalRevenue: number;
  totalItems: number;
  statusBreakdown: { status: string; count: number }[];
}

export async function getDailySummary(date: string): Promise<DailySummary> {
  const { tenantId } = await requireAdmin();

  const orders = await adminDb
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.tenantId, tenantId), eq(schema.orders.date, date)));

  const totalOrders = orders.length;

  if (totalOrders === 0) {
    return { totalOrders: 0, totalRevenue: 0, totalItems: 0, statusBreakdown: [] };
  }

  const orderIds = orders.map((o) => o.id);

  // Fetch ALL items for ALL orders in ONE query (fixes N+1)
  const allItems = await adminDb
    .select()
    .from(schema.orderItems)
    .where(inArray(schema.orderItems.orderId, orderIds));

  let totalRevenue = 0;
  let totalItems = 0;

  for (const item of allItems) {
    totalRevenue += item.amount;
    totalItems += item.quantity;
  }

  const statusMap: Record<string, number> = {};
  for (const order of orders) {
    const s = order.status ?? "draft";
    statusMap[s] = (statusMap[s] || 0) + 1;
  }

  const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({
    status,
    count,
  }));

  return { totalOrders, totalRevenue, totalItems, statusBreakdown };
}

export interface MonthlySummary {
  dailyRevenue: { date: string; day: number; revenue: number }[];
  totalRevenue: number;
  orderCount: number;
  topProducts: { name: string; qty: number; revenue: number }[];
  topClients: { name: string; revenue: number }[];
}

export async function getMonthlySummary(
  year: number,
  month: number
): Promise<MonthlySummary> {
  const { tenantId } = await requireAdmin();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

  const orders = await adminDb
    .select()
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        gte(schema.orders.date, startDate),
        lte(schema.orders.date, endDate),
      )
    );

  if (orders.length === 0) {
    const dailyRevenue = [];
    for (let d = 1; d <= endDay; d++) {
      dailyRevenue.push({
        date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        revenue: 0,
      });
    }
    return { dailyRevenue, totalRevenue: 0, orderCount: 0, topProducts: [], topClients: [] };
  }

  const orderIds = orders.map((o) => o.id);

  // Fetch ALL items for ALL orders in ONE query (fixes N+1)
  const allItems = await adminDb
    .select({
      orderId: schema.orderItems.orderId,
      quantity: schema.orderItems.quantity,
      amount: schema.orderItems.amount,
      productId: schema.orderItems.productId,
    })
    .from(schema.orderItems)
    .where(inArray(schema.orderItems.orderId, orderIds));

  // Fetch ALL unique product names in ONE query
  const uniqueProductIds = [...new Set(allItems.map((i) => i.productId))];
  const productNameMap: Record<number, string> = {};
  if (uniqueProductIds.length > 0) {
    const productRows = await adminDb
      .select({ id: schema.products.id, name: schema.products.name })
      .from(schema.products)
      .where(inArray(schema.products.id, uniqueProductIds));
    for (const p of productRows) {
      productNameMap[p.id] = p.name;
    }
  }

  // Fetch ALL unique client names in ONE query
  const uniqueClientIds = [...new Set(orders.map((o) => o.clientId))];
  const clientNameMap: Record<number, string> = {};
  if (uniqueClientIds.length > 0) {
    const clientRows = await adminDb
      .select({ id: schema.clients.id, shopName: schema.clients.shopName })
      .from(schema.clients)
      .where(inArray(schema.clients.id, uniqueClientIds));
    for (const c of clientRows) {
      clientNameMap[c.id] = c.shopName;
    }
  }

  // Group items by orderId
  const itemsByOrder = new Map<number, typeof allItems>();
  for (const item of allItems) {
    const arr = itemsByOrder.get(item.orderId) ?? [];
    arr.push(item);
    itemsByOrder.set(item.orderId, arr);
  }

  const dailyMap: Record<number, number> = {};
  const productMap: Record<number, { name: string; qty: number; revenue: number }> = {};
  const clientMap: Record<number, { name: string; revenue: number }> = {};
  let totalRevenue = 0;

  for (const order of orders) {
    const day = parseInt(order.date.split("-")[2], 10);
    const items = itemsByOrder.get(order.id) ?? [];

    let orderRevenue = 0;
    for (const item of items) {
      orderRevenue += item.amount;

      if (!productMap[item.productId]) {
        productMap[item.productId] = {
          name: productNameMap[item.productId] ?? "Unknown",
          qty: 0,
          revenue: 0,
        };
      }
      productMap[item.productId].qty += item.quantity;
      productMap[item.productId].revenue += item.amount;
    }

    dailyMap[day] = (dailyMap[day] || 0) + orderRevenue;
    totalRevenue += orderRevenue;

    if (!clientMap[order.clientId]) {
      clientMap[order.clientId] = {
        name: clientNameMap[order.clientId] ?? "Unknown",
        revenue: 0,
      };
    }
    clientMap[order.clientId].revenue += orderRevenue;
  }

  const dailyRevenue = [];
  for (let d = 1; d <= endDay; d++) {
    dailyRevenue.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      revenue: dailyMap[d] || 0,
    });
  }

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const topClients = Object.values(clientMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    dailyRevenue,
    totalRevenue,
    orderCount: orders.length,
    topProducts,
    topClients,
  };
}

export interface ProductAnalyticsRow {
  name: string;
  totalQty: number;
  totalRevenue: number;
  avgRate: number;
}

export async function getProductAnalytics(
  fyStart: string,
  fyEnd: string
): Promise<ProductAnalyticsRow[]> {
  const { tenantId } = await requireAdmin();

  const orders = await adminDb
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        gte(schema.orders.date, fyStart),
        lte(schema.orders.date, fyEnd),
      )
    );

  const orderIds = orders.map((o) => o.id);
  if (orderIds.length === 0) return [];

  // Fetch ALL items in ONE query (fixes N+1)
  const allItems = await adminDb
    .select()
    .from(schema.orderItems)
    .where(inArray(schema.orderItems.orderId, orderIds));

  // Fetch ALL unique product names in ONE query
  const uniqueProductIds = [...new Set(allItems.map((i) => i.productId))];
  const productNameMap: Record<number, string> = {};
  if (uniqueProductIds.length > 0) {
    const productRows = await adminDb
      .select({ id: schema.products.id, name: schema.products.name })
      .from(schema.products)
      .where(inArray(schema.products.id, uniqueProductIds));
    for (const p of productRows) {
      productNameMap[p.id] = p.name;
    }
  }

  const productMap: Record<
    number,
    { name: string; totalQty: number; totalRevenue: number }
  > = {};

  for (const item of allItems) {
    if (!productMap[item.productId]) {
      productMap[item.productId] = {
        name: productNameMap[item.productId] ?? "Unknown",
        totalQty: 0,
        totalRevenue: 0,
      };
    }
    productMap[item.productId].totalQty += item.quantity;
    productMap[item.productId].totalRevenue += item.amount;
  }

  return Object.values(productMap)
    .map((p) => ({
      ...p,
      avgRate: p.totalQty > 0 ? p.totalRevenue / p.totalQty : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export interface ClientAnalyticsRow {
  id: number;
  name: string;
  totalOrders: number;
  totalRevenue: number;
  outstandingBalance: number;
}

export async function getClientAnalytics(
  fyStart: string,
  fyEnd: string
): Promise<ClientAnalyticsRow[]> {
  const { tenantId } = await requireAdmin();

  const orders = await adminDb
    .select()
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        gte(schema.orders.date, fyStart),
        lte(schema.orders.date, fyEnd),
      )
    );

  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);

  // Fetch ALL items in ONE query (fixes N+1)
  const allItems = await adminDb
    .select({ orderId: schema.orderItems.orderId, amount: schema.orderItems.amount })
    .from(schema.orderItems)
    .where(inArray(schema.orderItems.orderId, orderIds));

  // Group item amounts by orderId
  const revenueByOrder = new Map<number, number>();
  for (const item of allItems) {
    revenueByOrder.set(item.orderId, (revenueByOrder.get(item.orderId) ?? 0) + item.amount);
  }

  // Fetch ALL unique client names in ONE query
  const uniqueClientIds = [...new Set(orders.map((o) => o.clientId))];
  const clientNameMap: Record<number, string> = {};
  if (uniqueClientIds.length > 0) {
    const clientRows = await adminDb
      .select({ id: schema.clients.id, shopName: schema.clients.shopName })
      .from(schema.clients)
      .where(inArray(schema.clients.id, uniqueClientIds));
    for (const c of clientRows) {
      clientNameMap[c.id] = c.shopName;
    }
  }

  const clientMap: Record<
    number,
    { name: string; totalOrders: number; totalRevenue: number }
  > = {};

  for (const order of orders) {
    if (!clientMap[order.clientId]) {
      clientMap[order.clientId] = {
        name: clientNameMap[order.clientId] ?? "Unknown",
        totalOrders: 0,
        totalRevenue: 0,
      };
    }
    clientMap[order.clientId].totalOrders += 1;
    clientMap[order.clientId].totalRevenue += revenueByOrder.get(order.id) ?? 0;
  }

  const results: ClientAnalyticsRow[] = [];
  for (const [idStr, data] of Object.entries(clientMap)) {
    const id = parseInt(idStr, 10);
    const outstandingBalance = await getClientBalance(tenantId, id);
    results.push({
      id,
      ...data,
      outstandingBalance,
    });
  }

  return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
}
