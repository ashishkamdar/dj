/**
 * Generate iCalendar (.ics) content for orders.
 * Each order becomes a separate VEVENT entry.
 * Works with iOS Calendar, Google Calendar, and Android calendar apps.
 */

interface CalendarOrder {
  id: number;
  date: string; // "YYYY-MM-DD"
  shopName: string;
  items: { name: string; quantity: number; unit: string }[];
  totalAmount: number;
  billingType: string;
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsDate(dateStr: string): string {
  // Convert "2026-04-20" to "20260420"
  return dateStr.replace(/-/g, "");
}

function buildItemsSummary(items: CalendarOrder["items"]): string {
  return items.map((i) => `${i.name} ${i.quantity}${i.unit}`).join(", ");
}

function formatCurrencyPlain(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function generateIcsForOrders(orders: CalendarOrder[]): string {
  const now = new Date();
  const timestamp =
    now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DJ Foods//Order Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const order of orders) {
    const summary = `${order.shopName} - ${formatCurrencyPlain(order.totalAmount)}`;
    const description = buildItemsSummary(order.items);
    const dateFormatted = formatIcsDate(order.date);
    const uid = `order-${order.id}-${order.date}@djfoods`;
    const billingLabel =
      order.billingType === "gst"
        ? "GST"
        : order.billingType === "non-gst"
          ? "Non-GST"
          : "Catering";

    ics.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART;VALUE=DATE:${dateFormatted}`,
      `DTEND;VALUE=DATE:${dateFormatted}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(`${billingLabel} | ${description}`)}`,
      "END:VEVENT",
    );
  }

  ics.push("END:VCALENDAR");
  return ics.join("\r\n");
}

export function generateIcsForSingleOrder(order: CalendarOrder): string {
  return generateIcsForOrders([order]);
}
