import { adminDb, schema } from "@/db";
import { and, eq } from "drizzle-orm";

export interface LedgerEntry {
  date: string;
  type: "invoice" | "payment" | "opening";
  description: string;
  debit: number;  // amount owed (invoice total)
  credit: number; // amount paid (payment)
  balance: number; // running balance
  referenceId?: number;
}

export async function getClientBalance(tenantId: number, clientId: number): Promise<number> {
  const clientRows = await adminDb.select().from(schema.clients)
    .where(and(eq(schema.clients.tenantId, tenantId), eq(schema.clients.id, clientId)));
  const client = clientRows[0];
  if (!client) return 0;

  let balance = client.openingBalance ?? 0;

  // Add all invoice grand totals
  const invoices = await adminDb.select({ total: schema.invoices.total })
    .from(schema.invoices)
    .where(and(eq(schema.invoices.tenantId, tenantId), eq(schema.invoices.clientId, clientId)));
  for (const inv of invoices) {
    balance += inv.total;
  }

  // Subtract all payments
  const payments = await adminDb.select({ amount: schema.payments.amount })
    .from(schema.payments)
    .where(and(eq(schema.payments.tenantId, tenantId), eq(schema.payments.clientId, clientId)));
  for (const pay of payments) {
    balance -= pay.amount;
  }

  return balance;
}

export async function getClientLedger(tenantId: number, clientId: number, fyStart?: string, fyEnd?: string): Promise<LedgerEntry[]> {
  const clientRows = await adminDb.select().from(schema.clients)
    .where(and(eq(schema.clients.tenantId, tenantId), eq(schema.clients.id, clientId)));
  const client = clientRows[0];
  if (!client) return [];

  const entries: LedgerEntry[] = [];

  // Opening balance entry
  entries.push({
    date: fyStart || "0000-00-00",
    type: "opening",
    description: "Opening Balance",
    debit: (client.openingBalance ?? 0) > 0 ? (client.openingBalance ?? 0) : 0,
    credit: (client.openingBalance ?? 0) < 0 ? Math.abs(client.openingBalance ?? 0) : 0,
    balance: 0, // calculated later
  });

  // Get invoices (optionally filtered by FY)
  const allInvoices = await adminDb.select({
    id: schema.invoices.id,
    date: schema.invoices.date,
    invoiceNumber: schema.invoices.invoiceNumber,
    total: schema.invoices.total,
  }).from(schema.invoices)
    .where(and(eq(schema.invoices.tenantId, tenantId), eq(schema.invoices.clientId, clientId)));

  const invoices = allInvoices.filter(inv => {
    if (fyStart && fyEnd) return inv.date >= fyStart && inv.date <= fyEnd;
    return true;
  });

  for (const inv of invoices) {
    entries.push({
      date: inv.date,
      type: "invoice",
      description: `Invoice ${inv.invoiceNumber}`,
      debit: inv.total,
      credit: 0,
      balance: 0,
      referenceId: inv.id,
    });
  }

  // Get payments (optionally filtered by FY)
  const allPayments = await adminDb.select().from(schema.payments)
    .where(and(eq(schema.payments.tenantId, tenantId), eq(schema.payments.clientId, clientId)));

  const payments = allPayments.filter(pay => {
    if (fyStart && fyEnd) return pay.date >= fyStart && pay.date <= fyEnd;
    return true;
  });

  for (const pay of payments) {
    entries.push({
      date: pay.date,
      type: "payment",
      description: `Payment (${pay.mode})${pay.notes ? " - " + pay.notes : ""}`,
      debit: 0,
      credit: pay.amount,
      balance: 0,
      referenceId: pay.id,
    });
  }

  // Sort by date
  entries.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate running balance
  let runningBalance = 0;
  for (const entry of entries) {
    runningBalance += entry.debit - entry.credit;
    entry.balance = runningBalance;
  }

  return entries;
}
