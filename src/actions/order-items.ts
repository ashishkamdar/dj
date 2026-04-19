"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updateItemStatus(
  itemId: number,
  newStatus: "received" | "cooking" | "cooked" | "packed"
) {
  const user = await requireAuth();

  db.update(schema.orderItems)
    .set({
      itemStatus: newStatus,
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.orderItems.id, itemId))
    .run();

  // Get the order to know which date to revalidate
  const item = db
    .select({ orderId: schema.orderItems.orderId })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.id, itemId))
    .get();

  if (item) {
    const order = db
      .select({ date: schema.orders.date })
      .from(schema.orders)
      .where(eq(schema.orders.id, item.orderId))
      .get();
    if (order) {
      revalidatePath(`/calendar/${order.date}`);
    }
  }
  revalidatePath(`/orders`);
}
