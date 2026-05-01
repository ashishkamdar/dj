import { NextRequest, NextResponse } from "next/server";
import { listOrders } from "@/actions/orders";
import { requireAuth } from "@/lib/session";

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const HEADERS = [
  "Order #",
  "Date",
  "Client",
  "Firm",
  "Billing Type",
  "Status",
  "Event",
  "Items",
  "Total (INR)",
  "Invoiced",
];

export async function GET(req: NextRequest) {
  await requireAuth();
  const sp = req.nextUrl.searchParams;

  const rows = await listOrders({
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    clientId: sp.get("clientId") ? Number(sp.get("clientId")) : undefined,
    firmId: sp.get("firmId") ? Number(sp.get("firmId")) : undefined,
    billingType:
      (sp.get("billingType") as "gst" | "non-gst" | "catering" | null) ??
      undefined,
    status:
      (sp.get("status") as "draft" | "confirmed" | "invoiced" | null) ??
      undefined,
    q: sp.get("q") || undefined,
  });

  const lines: string[] = [HEADERS.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.date,
        r.shopName ?? "",
        r.firmName ?? "",
        r.billingType,
        r.status ?? "",
        r.eventName ?? "",
        r.itemsCount,
        r.total.toFixed(2),
        r.isInvoiced ? "Yes" : "No",
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const csv = lines.join("\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${stamp}.csv"`,
    },
  });
}
