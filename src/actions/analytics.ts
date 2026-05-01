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

export interface SplitBucket {
  revenue: number;
  orders: number;
}

export interface OverviewSummary {
  range: { from: string; to: string };
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
  itemsSold: number;
  gstCollected: number;
  paymentsReceived: number;
  outstandingTotal: number;
  activeClients: number;
  splits: { kaccha: SplitBucket; pakka: SplitBucket; catering: SplitBucket };
  trend: { label: string; revenue: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  topClients: { id: number; name: string; revenue: number }[];
  topOutstanding: { id: number; name: string; balance: number }[];
}

export type OverviewPeriod = "week" | "month" | "year";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isoWeekStart(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - (jan4Day - 1));
  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (week - 1) * 7);
  return monday;
}

function computeRange(period: OverviewPeriod, anchor: string) {
  if (period === "week") {
    const m = /^(\d{4})-W(\d{2})$/.exec(anchor);
    if (m) {
      const y = parseInt(m[1], 10);
      const w = parseInt(m[2], 10);
      const monday = isoWeekStart(y, w);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: isoDate(monday), to: isoDate(sunday) };
    }
    const d = new Date(anchor);
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: isoDate(monday), to: isoDate(sunday) };
  }
  if (period === "month") {
    const m = /^(\d{4})-(\d{2})$/.exec(anchor);
    const y = m ? parseInt(m[1], 10) : new Date().getFullYear();
    const mo = m ? parseInt(m[2], 10) : new Date().getMonth() + 1;
    const lastDay = new Date(y, mo, 0).getDate();
    return { from: `${y}-${pad2(mo)}-01`, to: `${y}-${pad2(mo)}-${pad2(lastDay)}` };
  }
  const y = parseInt(anchor, 10) || new Date().getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function trendBucketKey(period: OverviewPeriod, date: string): string {
  if (period === "year") return date.slice(0, 7);
  return date;
}

function buildTrendSeries(
  period: OverviewPeriod,
  range: { from: string; to: string },
  buckets: Map<string, number>,
): { label: string; revenue: number }[] {
  const out: { label: string; revenue: number }[] = [];
  if (period === "year") {
    const y = parseInt(range.from.slice(0, 4), 10);
    for (let m = 1; m <= 12; m++) {
      const key = `${y}-${pad2(m)}`;
      out.push({ label: pad2(m), revenue: buckets.get(key) ?? 0 });
    }
    return out;
  }
  const start = new Date(range.from);
  const end = new Date(range.to);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  for (const d of days) {
    const key = isoDate(d);
    out.push({
      label: String(d.getDate()),
      revenue: buckets.get(key) ?? 0,
    });
  }
  return out;
}

async function aggregateOutstanding(tenantId: number) {
  const clientRows = await adminDb
    .select({ id: schema.clients.id, name: schema.clients.shopName })
    .from(schema.clients)
    .where(eq(schema.clients.tenantId, tenantId));

  const balances = await Promise.all(
    clientRows.map(async (c) => ({
      id: c.id,
      name: c.name,
      balance: await getClientBalance(tenantId, c.id),
    })),
  );

  const positives = balances.filter((b) => b.balance > 0);
  const total = positives.reduce((s, b) => s + b.balance, 0);
  const topClients = positives
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  return { total, topClients };
}

export async function getOverviewSummary(
  period: OverviewPeriod,
  anchor: string,
): Promise<OverviewSummary> {
  const { tenantId } = await requireAdmin();
  const range = computeRange(period, anchor);

  const [orders, paymentsInRange, outstandingAgg] = await Promise.all([
    adminDb
      .select({
        id: schema.orders.id,
        date: schema.orders.date,
        clientId: schema.orders.clientId,
        billingType: schema.orders.billingType,
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.tenantId, tenantId),
          gte(schema.orders.date, range.from),
          lte(schema.orders.date, range.to),
        ),
      ),
    adminDb
      .select({ amount: schema.payments.amount })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.tenantId, tenantId),
          gte(schema.payments.date, range.from),
          lte(schema.payments.date, range.to),
        ),
      ),
    aggregateOutstanding(tenantId),
  ]);

  const orderIds = orders.map((o) => o.id);

  const [items, invoiceTaxRows] = await Promise.all([
    orderIds.length === 0
      ? Promise.resolve([] as Array<{
          orderId: number;
          productId: number;
          quantity: number;
          amount: number;
        }>)
      : adminDb
          .select({
            orderId: schema.orderItems.orderId,
            productId: schema.orderItems.productId,
            quantity: schema.orderItems.quantity,
            amount: schema.orderItems.amount,
          })
          .from(schema.orderItems)
          .where(inArray(schema.orderItems.orderId, orderIds)),
    orderIds.length === 0
      ? Promise.resolve([] as Array<{ cgst: number | null; sgst: number | null }>)
      : adminDb
          .select({
            cgst: schema.invoices.cgstAmount,
            sgst: schema.invoices.sgstAmount,
          })
          .from(schema.invoices)
          .where(inArray(schema.invoices.orderId, orderIds)),
  ]);

  const revenueByOrder = new Map<number, number>();
  let itemsSold = 0;
  const productAgg = new Map<number, { qty: number; revenue: number }>();
  for (const it of items) {
    revenueByOrder.set(
      it.orderId,
      (revenueByOrder.get(it.orderId) ?? 0) + it.amount,
    );
    itemsSold += it.quantity;
    const cur = productAgg.get(it.productId) ?? { qty: 0, revenue: 0 };
    cur.qty += it.quantity;
    cur.revenue += it.amount;
    productAgg.set(it.productId, cur);
  }

  let revenue = 0;
  const splits: OverviewSummary["splits"] = {
    kaccha: { revenue: 0, orders: 0 },
    pakka: { revenue: 0, orders: 0 },
    catering: { revenue: 0, orders: 0 },
  };
  const trendBuckets = new Map<string, number>();
  const clientAgg = new Map<number, number>();
  const activeClientSet = new Set<number>();

  for (const o of orders) {
    const orderRev = revenueByOrder.get(o.id) ?? 0;
    revenue += orderRev;
    if (o.billingType === "non-gst") {
      splits.kaccha.revenue += orderRev;
      splits.kaccha.orders += 1;
    } else if (o.billingType === "gst") {
      splits.pakka.revenue += orderRev;
      splits.pakka.orders += 1;
    } else {
      splits.catering.revenue += orderRev;
      splits.catering.orders += 1;
    }
    const bucket = trendBucketKey(period, o.date);
    trendBuckets.set(bucket, (trendBuckets.get(bucket) ?? 0) + orderRev);
    clientAgg.set(o.clientId, (clientAgg.get(o.clientId) ?? 0) + orderRev);
    activeClientSet.add(o.clientId);
  }

  let gstCollected = 0;
  for (const tax of invoiceTaxRows) {
    gstCollected += (tax.cgst ?? 0) + (tax.sgst ?? 0);
  }

  const paymentsReceived = paymentsInRange.reduce(
    (sum, p) => sum + (p.amount ?? 0),
    0,
  );

  const productIds = [...productAgg.keys()];
  const clientIds = [...clientAgg.keys()];
  const [productNames, clientNames] = await Promise.all([
    productIds.length === 0
      ? Promise.resolve([] as { id: number; name: string }[])
      : adminDb
          .select({ id: schema.products.id, name: schema.products.name })
          .from(schema.products)
          .where(inArray(schema.products.id, productIds)),
    clientIds.length === 0
      ? Promise.resolve([] as { id: number; name: string }[])
      : adminDb
          .select({ id: schema.clients.id, name: schema.clients.shopName })
          .from(schema.clients)
          .where(inArray(schema.clients.id, clientIds)),
  ]);

  const productNameMap = new Map(productNames.map((p) => [p.id, p.name]));
  const clientNameMap = new Map(clientNames.map((c) => [c.id, c.name]));

  const topProducts = [...productAgg.entries()]
    .map(([id, v]) => ({
      name: productNameMap.get(id) ?? "Unknown",
      qty: v.qty,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const topClients = [...clientAgg.entries()]
    .map(([id, rev]) => ({
      id,
      name: clientNameMap.get(id) ?? "Unknown",
      revenue: rev,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const trend = buildTrendSeries(period, range, trendBuckets);

  return {
    range,
    revenue,
    orderCount: orders.length,
    avgOrderValue: orders.length > 0 ? revenue / orders.length : 0,
    itemsSold,
    gstCollected,
    paymentsReceived,
    outstandingTotal: outstandingAgg.total,
    activeClients: activeClientSet.size,
    splits,
    trend,
    topProducts,
    topClients,
    topOutstanding: outstandingAgg.topClients,
  };
}
