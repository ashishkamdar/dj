import { adminDb, schema } from "@/db";
import { eq, and, like } from "drizzle-orm";
import { getFYFromDate } from "./financial-year";

export async function generateInvoiceNumber(tenantId: number, firmId: number, date: string): Promise<string> {
  // Get the firm for prefix
  const firmRows = await adminDb.select().from(schema.firms)
    .where(and(eq(schema.firms.tenantId, tenantId), eq(schema.firms.id, firmId)));
  const firm = firmRows[0];
  if (!firm) throw new Error("Firm not found");

  // Get FY from the invoice date
  const fy = getFYFromDate(new Date(date + "T00:00:00"));

  // Create prefix from first 2-3 chars of firm name (uppercase)
  const prefix = firm.name.replace(/[^A-Za-z]/g, "").substring(0, 3).toUpperCase() || "INV";

  // Count existing invoices for this firm in this FY
  const pattern = `${prefix}/${fy.label}/%`;
  const existing = await adminDb.select()
    .from(schema.invoices)
    .where(and(
      eq(schema.invoices.tenantId, tenantId),
      eq(schema.invoices.firmId, firmId),
      like(schema.invoices.invoiceNumber, pattern)
    ));

  const nextSeq = existing.length + 1;
  return `${prefix}/${fy.label}/${String(nextSeq).padStart(3, "0")}`;
}
