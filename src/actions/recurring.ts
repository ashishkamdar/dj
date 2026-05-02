"use server";

import { adminDb, withTenantDb, schema } from "@/db";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { requireAdmin, requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";

const DAY_BITS = [1, 2, 4, 8, 16, 32, 64]; // Sunday=bit0 ... Saturday=bit6

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextDateString(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const next = new Date(y, m - 1, day + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

function jsDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay(); // 0 = Sunday
}

export type RecurringTemplateRow = {
  id: number;
  clientId: number;
  firmId: number;
  name: string;
  daysOfWeek: number;
  billingType: "gst" | "non-gst" | "catering";
  notes: string | null;
  isActive: boolean;
  shopName: string | null;
  firmName: string | null;
  items: Array<{
    id: number;
    productId: number;
    productName: string | null;
    quantity: number;
    unit: string | null;
    rate: number;
  }>;
};

export async function getRecurringTemplates(): Promise<RecurringTemplateRow[]> {
  const { tenantId } = await requireAdmin();

  const templates = await adminDb
    .select({
      id: schema.recurringTemplates.id,
      clientId: schema.recurringTemplates.clientId,
      firmId: schema.recurringTemplates.firmId,
      name: schema.recurringTemplates.name,
      daysOfWeek: schema.recurringTemplates.daysOfWeek,
      billingType: schema.recurringTemplates.billingType,
      notes: schema.recurringTemplates.notes,
      isActive: schema.recurringTemplates.isActive,
      shopName: schema.clients.shopName,
      firmName: schema.firms.name,
    })
    .from(schema.recurringTemplates)
    .leftJoin(
      schema.clients,
      eq(schema.recurringTemplates.clientId, schema.clients.id),
    )
    .leftJoin(
      schema.firms,
      eq(schema.recurringTemplates.firmId, schema.firms.id),
    )
    .where(eq(schema.recurringTemplates.tenantId, tenantId))
    .orderBy(desc(schema.recurringTemplates.id));

  if (templates.length === 0) return [];

  const ids = templates.map((t) => t.id);
  const items = await adminDb
    .select({
      id: schema.recurringTemplateItems.id,
      templateId: schema.recurringTemplateItems.templateId,
      productId: schema.recurringTemplateItems.productId,
      quantity: schema.recurringTemplateItems.quantity,
      unit: schema.recurringTemplateItems.unit,
      rate: schema.recurringTemplateItems.rate,
      productName: schema.products.name,
    })
    .from(schema.recurringTemplateItems)
    .leftJoin(
      schema.products,
      eq(schema.recurringTemplateItems.productId, schema.products.id),
    )
    .where(inArray(schema.recurringTemplateItems.templateId, ids));

  const itemsByTemplate = new Map<number, typeof items>();
  for (const it of items) {
    const arr = itemsByTemplate.get(it.templateId) ?? [];
    arr.push(it);
    itemsByTemplate.set(it.templateId, arr);
  }

  return templates.map((t) => ({
    ...t,
    isActive: t.isActive ?? true,
    items: (itemsByTemplate.get(t.id) ?? []).map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unit: i.unit,
      rate: i.rate,
    })),
  }));
}

export async function getRecurringTemplate(id: number) {
  const { tenantId } = await requireAdmin();
  const rows = await adminDb
    .select()
    .from(schema.recurringTemplates)
    .where(
      and(
        eq(schema.recurringTemplates.tenantId, tenantId),
        eq(schema.recurringTemplates.id, id),
      ),
    );
  const tpl = rows[0];
  if (!tpl) return null;
  const items = await adminDb
    .select()
    .from(schema.recurringTemplateItems)
    .where(eq(schema.recurringTemplateItems.templateId, id));
  return { ...tpl, items };
}

export async function createRecurringTemplate(formData: FormData) {
  const user = await requireAdmin();
  const { tenantId } = user;

  const clientId = parseInt(formData.get("clientId") as string, 10);
  const firmId = parseInt(formData.get("firmId") as string, 10);
  const name = (formData.get("name") as string) ?? "";
  const daysOfWeek = parseInt(formData.get("daysOfWeek") as string, 10) || 0;
  const billingType = (formData.get("billingType") as
    | "gst"
    | "non-gst"
    | "catering"
    | null) ?? "non-gst";
  const notes = (formData.get("notes") as string) || null;
  const itemsJson = formData.get("items") as string;

  if (!clientId || !firmId) throw new Error("Client and firm are required");
  if (!daysOfWeek) throw new Error("Pick at least one day of the week");

  const items = JSON.parse(itemsJson) as Array<{
    productId: number;
    quantity: number;
    unit: string;
    rate: number;
  }>;
  if (!items.length) throw new Error("At least one item is required");

  await withTenantDb(tenantId, async (db) => {
    const [tpl] = await db
      .insert(schema.recurringTemplates)
      .values({
        tenantId,
        clientId,
        firmId,
        name,
        daysOfWeek,
        billingType,
        notes,
        createdBy: user.id,
      })
      .returning({ id: schema.recurringTemplates.id });

    await db.insert(schema.recurringTemplateItems).values(
      items.map((i) => ({
        tenantId,
        templateId: tpl.id,
        productId: i.productId,
        quantity: i.quantity,
        unit: i.unit,
        rate: i.rate,
      })),
    );
  });

  revalidatePath("/recurring");
}

export async function updateRecurringTemplate(id: number, formData: FormData) {
  const { tenantId } = await requireAdmin();

  const clientId = parseInt(formData.get("clientId") as string, 10);
  const firmId = parseInt(formData.get("firmId") as string, 10);
  const name = (formData.get("name") as string) ?? "";
  const daysOfWeek = parseInt(formData.get("daysOfWeek") as string, 10) || 0;
  const billingType = (formData.get("billingType") as
    | "gst"
    | "non-gst"
    | "catering"
    | null) ?? "non-gst";
  const notes = (formData.get("notes") as string) || null;
  const itemsJson = formData.get("items") as string;

  if (!clientId || !firmId) throw new Error("Client and firm are required");
  if (!daysOfWeek) throw new Error("Pick at least one day of the week");

  const items = JSON.parse(itemsJson) as Array<{
    productId: number;
    quantity: number;
    unit: string;
    rate: number;
  }>;
  if (!items.length) throw new Error("At least one item is required");

  await withTenantDb(tenantId, async (db) => {
    await db
      .update(schema.recurringTemplates)
      .set({
        clientId,
        firmId,
        name,
        daysOfWeek,
        billingType,
        notes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.recurringTemplates.tenantId, tenantId),
          eq(schema.recurringTemplates.id, id),
        ),
      );

    await db
      .delete(schema.recurringTemplateItems)
      .where(eq(schema.recurringTemplateItems.templateId, id));

    await db.insert(schema.recurringTemplateItems).values(
      items.map((i) => ({
        tenantId,
        templateId: id,
        productId: i.productId,
        quantity: i.quantity,
        unit: i.unit,
        rate: i.rate,
      })),
    );
  });

  revalidatePath("/recurring");
}

export async function deleteRecurringTemplate(id: number) {
  const { tenantId } = await requireAdmin();
  await withTenantDb(tenantId, async (db) => {
    await db
      .delete(schema.recurringTemplates)
      .where(
        and(
          eq(schema.recurringTemplates.tenantId, tenantId),
          eq(schema.recurringTemplates.id, id),
        ),
      );
  });
  revalidatePath("/recurring");
}

export async function toggleRecurringActive(id: number) {
  const { tenantId } = await requireAdmin();
  await withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select({ isActive: schema.recurringTemplates.isActive })
      .from(schema.recurringTemplates)
      .where(eq(schema.recurringTemplates.id, id));
    const cur = rows[0];
    if (!cur) return;
    await db
      .update(schema.recurringTemplates)
      .set({ isActive: !cur.isActive, updatedAt: new Date() })
      .where(
        and(
          eq(schema.recurringTemplates.tenantId, tenantId),
          eq(schema.recurringTemplates.id, id),
        ),
      );
  });
  revalidatePath("/recurring");
}

/**
 * Idempotent. Generates one order per active template that matches the
 * day-of-week, for every date between (lastGenAt + 1) and today inclusive.
 * Returns the count of new orders inserted.
 */
export async function ensureRecurringGenerated(): Promise<number> {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return 0;
  }
  const { tenantId } = session;

  const today = todayString();

  const tenantRows = await adminDb
    .select({ lastRecurringGenAt: schema.tenants.lastRecurringGenAt })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId));
  const lastGen = tenantRows[0]?.lastRecurringGenAt ?? null;

  if (lastGen === today) return 0;

  // Active templates with their items, fetched once.
  const templates = await adminDb
    .select()
    .from(schema.recurringTemplates)
    .where(
      and(
        eq(schema.recurringTemplates.tenantId, tenantId),
        eq(schema.recurringTemplates.isActive, true),
      ),
    );
  if (templates.length === 0) {
    await adminDb
      .update(schema.tenants)
      .set({ lastRecurringGenAt: today })
      .where(eq(schema.tenants.id, tenantId));
    return 0;
  }
  const tplIds = templates.map((t) => t.id);
  const allItems = await adminDb
    .select()
    .from(schema.recurringTemplateItems)
    .where(inArray(schema.recurringTemplateItems.templateId, tplIds));
  const itemsByTpl = new Map<number, typeof allItems>();
  for (const it of allItems) {
    const arr = itemsByTpl.get(it.templateId) ?? [];
    arr.push(it);
    itemsByTpl.set(it.templateId, arr);
  }

  // Build the date range to generate. If never generated, do today only.
  const dates: string[] = [];
  if (!lastGen) {
    dates.push(today);
  } else {
    let cur = nextDateString(lastGen);
    while (cur <= today) {
      dates.push(cur);
      cur = nextDateString(cur);
    }
  }

  let inserted = 0;

  await withTenantDb(tenantId, async (db) => {
    for (const date of dates) {
      const dow = jsDayOfWeek(date);
      const bit = DAY_BITS[dow];
      for (const t of templates) {
        if ((t.daysOfWeek & bit) === 0) continue;
        const items = itemsByTpl.get(t.id) ?? [];
        if (items.length === 0) continue;
        const [order] = await db
          .insert(schema.orders)
          .values({
            tenantId,
            date,
            clientId: t.clientId,
            firmId: t.firmId,
            billingType: t.billingType,
            status: "draft",
            generatedFromTemplateId: t.id,
            createdBy: t.createdBy ?? null,
            updatedBy: t.createdBy ?? null,
          })
          .returning({ id: schema.orders.id });

        await db.insert(schema.orderItems).values(
          items.map((i) => ({
            tenantId,
            orderId: order.id,
            productId: i.productId,
            quantity: i.quantity,
            unit: i.unit ?? "kg",
            rate: i.rate,
            amount: i.quantity * i.rate,
          })),
        );
        inserted++;
      }
    }

    await db
      .update(schema.tenants)
      .set({ lastRecurringGenAt: today })
      .where(eq(schema.tenants.id, tenantId));
  });

  if (inserted > 0) {
    revalidatePath("/recurring");
    revalidatePath("/orders");
    revalidatePath("/calendar");
  }
  return inserted;
}

export async function getPendingRecurringDrafts() {
  const { tenantId } = await requireAuth();
  const rows = await adminDb
    .select({
      id: schema.orders.id,
      date: schema.orders.date,
      clientId: schema.orders.clientId,
      firmId: schema.orders.firmId,
      billingType: schema.orders.billingType,
      shopName: schema.clients.shopName,
      firmName: schema.firms.name,
      generatedFromTemplateId: schema.orders.generatedFromTemplateId,
    })
    .from(schema.orders)
    .leftJoin(schema.clients, eq(schema.orders.clientId, schema.clients.id))
    .leftJoin(schema.firms, eq(schema.orders.firmId, schema.firms.id))
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        eq(schema.orders.status, "draft"),
        isNotNull(schema.orders.generatedFromTemplateId),
      ),
    )
    .orderBy(desc(schema.orders.date), desc(schema.orders.id));

  if (rows.length === 0) return [];

  const orderIds = rows.map((r) => r.id);
  const items = await adminDb
    .select({
      orderId: schema.orderItems.orderId,
      productName: schema.products.name,
      quantity: schema.orderItems.quantity,
      unit: schema.orderItems.unit,
      amount: schema.orderItems.amount,
    })
    .from(schema.orderItems)
    .leftJoin(
      schema.products,
      eq(schema.orderItems.productId, schema.products.id),
    )
    .where(inArray(schema.orderItems.orderId, orderIds));

  const byOrder = new Map<number, typeof items>();
  for (const it of items) {
    const arr = byOrder.get(it.orderId) ?? [];
    arr.push(it);
    byOrder.set(it.orderId, arr);
  }

  return rows.map((r) => {
    const its = byOrder.get(r.id) ?? [];
    const total = its.reduce((s, i) => s + i.amount, 0);
    return {
      ...r,
      items: its.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unit: i.unit,
      })),
      total,
    };
  });
}

export async function getPendingRecurringCount(): Promise<number> {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return 0;
  }
  const { tenantId } = session;
  const rows = await adminDb
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        eq(schema.orders.status, "draft"),
        isNotNull(schema.orders.generatedFromTemplateId),
      ),
    );
  return rows.length;
}

export async function confirmRecurringDraft(orderId: number) {
  const { tenantId } = await requireAdmin();
  await withTenantDb(tenantId, async (db) => {
    await db
      .update(schema.orders)
      .set({ status: "invoiced", updatedAt: new Date() })
      .where(
        and(
          eq(schema.orders.tenantId, tenantId),
          eq(schema.orders.id, orderId),
          eq(schema.orders.status, "draft"),
          isNotNull(schema.orders.generatedFromTemplateId),
        ),
      );
  });
  revalidatePath("/recurring");
  revalidatePath("/orders");
  revalidatePath("/calendar");
}
