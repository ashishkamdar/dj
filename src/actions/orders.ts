"use server";

import { db, schema } from "@/db";
import { and, gte, lte, sql } from "drizzle-orm";

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
