"use server";

import { withTenantDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updateItemStatus(
  itemId: number,
  newStatus: "received" | "cooking" | "cooked" | "packed"
) {
  const user = await requireAuth();
  const { tenantId } = user;

  await withTenantDb(tenantId, async (db) => {
    await db.update(schema.orderItems)
      .set({
        itemStatus: newStatus,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.orderItems.id, itemId));

    // Get the order to know which date to revalidate
    const itemRows = await db
      .select({ orderId: schema.orderItems.orderId })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.id, itemId));
    const item = itemRows[0];

    if (item) {
      const orderRows = await db
        .select({ date: schema.orders.date })
        .from(schema.orders)
        .where(eq(schema.orders.id, item.orderId));
      const order = orderRows[0];
      if (order) {
        revalidatePath(`/calendar/${order.date}`);
      }
    }
  });

  revalidatePath(`/orders`);
}
