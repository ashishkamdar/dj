import { db, schema } from "@/db";
import { eq, and, like } from "drizzle-orm";
import { getFYFromDate } from "./financial-year";

export function generateInvoiceNumber(firmId: number, date: string): string {
  // Get the firm for prefix
  const firm = db.select().from(schema.firms).where(eq(schema.firms.id, firmId)).get();
  if (!firm) throw new Error("Firm not found");

  // Get FY from the invoice date
  const fy = getFYFromDate(new Date(date + "T00:00:00"));

  // Create prefix from first 2-3 chars of firm name (uppercase)
  const prefix = firm.name.replace(/[^A-Za-z]/g, "").substring(0, 3).toUpperCase() || "INV";

  // Count existing invoices for this firm in this FY
  const pattern = `${prefix}/${fy.label}/%`;
  const existing = db.select()
    .from(schema.invoices)
    .where(and(
      eq(schema.invoices.firmId, firmId),
      like(schema.invoices.invoiceNumber, pattern)
    ))
    .all();

  const nextSeq = existing.length + 1;
  return `${prefix}/${fy.label}/${String(nextSeq).padStart(3, "0")}`;
}
