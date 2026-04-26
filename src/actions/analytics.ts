"use server";

import { withTenantDb, schema } from "@/db";
import { eq, and, gte, lte } from "drizzle-orm";
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

  return withTenantDb(tenantId, async (db) => {
    const orders = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.date, date));

    const totalOrders = orders.length;

    let totalRevenue = 0;
    let totalItems = 0;

    for (const order of orders) {
      const items = await db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, order.id));

      for (const item of items) {
        totalRevenue += item.amount;
        totalItems += item.quantity;
      }
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
  });
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

  return withTenantDb(tenantId, async (db) => {
    const orders = await db
      .select()
      .from(schema.orders)
      .where(
        and(gte(schema.orders.date, startDate), lte(schema.orders.date, endDate))
      );

    const dailyMap: Record<number, number> = {};
    const productMap: Record<number, { name: string; qty: number; revenue: number }> = {};
    const clientMap: Record<number, { name: string; revenue: number }> = {};
    let totalRevenue = 0;

    for (const order of orders) {
      const day = parseInt(order.date.split("-")[2], 10);

      const items = await db
        .select({
          quantity: schema.orderItems.quantity,
          amount: schema.orderItems.amount,
          productId: schema.orderItems.productId,
        })
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, order.id));

      let orderRevenue = 0;
      for (const item of items) {
        orderRevenue += item.amount;

        if (!productMap[item.productId]) {
          const productRows = await db
            .select({ name: schema.products.name })
            .from(schema.products)
            .where(eq(schema.products.id, item.productId));
          const product = productRows[0];
          productMap[item.productId] = {
            name: product?.name ?? "Unknown",
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
        const clientRows = await db
          .select({ shopName: schema.clients.shopName })
          .from(schema.clients)
          .where(eq(schema.clients.id, order.clientId));
        const client = clientRows[0];
        clientMap[order.clientId] = {
          name: client?.shopName ?? "Unknown",
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
  });
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

  return withTenantDb(tenantId, async (db) => {
    const orders = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(
        and(gte(schema.orders.date, fyStart), lte(schema.orders.date, fyEnd))
      );

    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) return [];

    const productMap: Record<
      number,
      { name: string; totalQty: number; totalRevenue: number }
    > = {};

    for (const orderId of orderIds) {
      const items = await db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, orderId));

      for (const item of items) {
        if (!productMap[item.productId]) {
          const productRows = await db
            .select({ name: schema.products.name })
            .from(schema.products)
            .where(eq(schema.products.id, item.productId));
          const product = productRows[0];
          productMap[item.productId] = {
            name: product?.name ?? "Unknown",
            totalQty: 0,
            totalRevenue: 0,
          };
        }
        productMap[item.productId].totalQty += item.quantity;
        productMap[item.productId].totalRevenue += item.amount;
      }
    }

    return Object.values(productMap)
      .map((p) => ({
        ...p,
        avgRate: p.totalQty > 0 ? p.totalRevenue / p.totalQty : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  });
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

  return withTenantDb(tenantId, async (db) => {
    const orders = await db
      .select()
      .from(schema.orders)
      .where(
        and(gte(schema.orders.date, fyStart), lte(schema.orders.date, fyEnd))
      );

    const clientMap: Record<
      number,
      { name: string; totalOrders: number; totalRevenue: number }
    > = {};

    for (const order of orders) {
      if (!clientMap[order.clientId]) {
        const clientRows = await db
          .select({ shopName: schema.clients.shopName })
          .from(schema.clients)
          .where(eq(schema.clients.id, order.clientId));
        const client = clientRows[0];
        clientMap[order.clientId] = {
          name: client?.shopName ?? "Unknown",
          totalOrders: 0,
          totalRevenue: 0,
        };
      }
      clientMap[order.clientId].totalOrders += 1;

      const items = await db
        .select({ amount: schema.orderItems.amount })
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, order.id));

      for (const item of items) {
        clientMap[order.clientId].totalRevenue += item.amount;
      }
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
  });
}
