import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

// ── Indian currency formatting (no Intl in react-pdf) ─────────────────────
function formatINR(n: number): string {
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, dec] = fixed.split(".");
  let result = "";
  const digits = intPart.split("");
  const len = digits.length;
  for (let i = 0; i < len; i++) {
    const pos = len - i;
    if (i > 0 && pos === 3) result += ",";
    if (i > 0 && pos > 3 && pos % 2 === 1) result += ",";
    result += digits[i];
  }
  return (n < 0 ? "-" : "") + result + "." + dec;
}

// ── Types ─────────────────────────────────────────────────────────────────
export interface CateringInvoiceProps {
  invoice: {
    invoiceNumber: string;
    date: string;
    subtotal: number;
    advancePaid: number;
    balanceDue: number;
    size: "A6" | "A4";
  };
  firm: {
    name: string;
    address: string;
    phone: string;
    email: string;
    bankName: string;
    bankAccount: string;
    bankIfsc: string;
    logo?: string;
  };
  client: {
    shopName: string;
    ownerName: string;
    phone: string;
    address: string;
  };
  event: {
    eventName: string;
    eventDate: string;
  };
  items: {
    productName: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  signatureUrl?: string;
}

const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  A6: { width: 297.64, height: 419.53 },
} as const;

function buildStyles(size: "A6" | "A4") {
  const isA6 = size === "A6";
  const fs = {
    title: isA6 ? 11 : 16,
    subtitle: isA6 ? 7 : 10,
    body: isA6 ? 7 : 10,
    small: isA6 ? 6 : 8,
    tableHeader: isA6 ? 7 : 9,
    tableCell: isA6 ? 7 : 9,
    totalLabel: isA6 ? 8 : 11,
    grandTotal: isA6 ? 9 : 12,
  };
  const p = isA6 ? 10 : 20;

  return StyleSheet.create({
    page: {
      padding: p,
      fontFamily: "Helvetica",
      fontSize: fs.body,
    },
    header: {
      alignItems: "center",
      marginBottom: isA6 ? 6 : 12,
      borderBottomWidth: 1,
      borderBottomColor: "#333",
      paddingBottom: isA6 ? 4 : 8,
    },
    firmName: {
      fontSize: fs.title,
      fontFamily: "Helvetica-Bold",
      marginBottom: 2,
    },
    firmDetails: {
      fontSize: fs.small,
      color: "#555",
      textAlign: "center",
    },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: isA6 ? 2 : 4,
    },
    metaText: {
      fontSize: fs.body,
    },
    sectionTitle: {
      fontSize: fs.body,
      fontFamily: "Helvetica-Bold",
      marginBottom: 2,
    },
    eventSection: {
      marginBottom: isA6 ? 6 : 10,
      borderBottomWidth: 0.5,
      borderBottomColor: "#ccc",
      paddingBottom: isA6 ? 4 : 8,
    },
    eventText: {
      fontSize: fs.body,
      marginBottom: 1,
    },
    eventLabel: {
      fontSize: fs.body,
      fontFamily: "Helvetica-Bold",
    },
    // ── Table ──
    table: {
      marginBottom: isA6 ? 6 : 10,
    },
    tableHeaderRow: {
      flexDirection: "row",
      backgroundColor: "#f0f0f0",
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: "#333",
      paddingVertical: isA6 ? 2 : 4,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: "#ddd",
      paddingVertical: isA6 ? 2 : 3,
    },
    thSno: { width: "8%", textAlign: "center", fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thItem: { width: "37%", paddingLeft: 4, fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thQty: { width: "13%", textAlign: "center", fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thRate: { width: "20%", textAlign: "right", fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thAmt: { width: "22%", textAlign: "right", paddingRight: 4, fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    tdSno: { width: "8%", textAlign: "center", fontSize: fs.tableCell } as Style,
    tdItem: { width: "37%", paddingLeft: 4, fontSize: fs.tableCell } as Style,
    tdQty: { width: "13%", textAlign: "center", fontSize: fs.tableCell } as Style,
    tdRate: { width: "20%", textAlign: "right", fontSize: fs.tableCell } as Style,
    tdAmt: { width: "22%", textAlign: "right", paddingRight: 4, fontSize: fs.tableCell } as Style,
    // ── Totals ──
    totalsSection: {
      alignItems: "flex-end",
      marginBottom: isA6 ? 6 : 10,
      paddingTop: isA6 ? 4 : 6,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 2,
    },
    totalLabel: {
      fontSize: fs.totalLabel,
      width: 120,
      textAlign: "right",
      marginRight: 8,
    },
    totalValue: {
      fontSize: fs.totalLabel,
      width: 80,
      textAlign: "right",
    },
    grandTotalRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      borderTopWidth: 1,
      borderTopColor: "#333",
      paddingTop: 3,
      marginTop: 2,
    },
    grandTotalLabel: {
      fontSize: fs.grandTotal,
      fontFamily: "Helvetica-Bold",
      width: 120,
      textAlign: "right",
      marginRight: 8,
    },
    grandTotalValue: {
      fontSize: fs.grandTotal,
      fontFamily: "Helvetica-Bold",
      width: 80,
      textAlign: "right",
    },
    // ── Signature ──
    signatureSection: {
      alignItems: "flex-end",
      marginTop: isA6 ? 10 : 20,
    },
    signatureImage: {
      width: isA6 ? 50 : 80,
      height: isA6 ? 25 : 40,
      marginBottom: 2,
    },
    signatureLabel: {
      fontSize: fs.small,
      color: "#555",
    },
  });
}

// ── Component ─────────────────────────────────────────────────────────────
export function CateringInvoice({
  invoice,
  firm,
  client,
  event,
  items,
  signatureUrl,
}: CateringInvoiceProps) {
  const s = buildStyles(invoice.size);
  const pgSize = PAGE_SIZES[invoice.size];

  return (
    <Document>
      <Page size={[pgSize.width, pgSize.height]} style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.firmName}>{firm.name}</Text>
          <Text style={s.firmDetails}>
            {[firm.address, firm.phone, firm.email]
              .filter(Boolean)
              .join("  |  ")}
          </Text>
        </View>

        {/* Invoice meta */}
        <View style={s.metaRow}>
          <Text style={s.metaText}>Invoice No: {invoice.invoiceNumber}</Text>
          <Text style={s.metaText}>Date: {invoice.date}</Text>
        </View>

        {/* Event & client details */}
        <View style={s.eventSection}>
          <Text style={s.eventText}>
            <Text style={s.eventLabel}>Event: </Text>
            {event.eventName}
          </Text>
          <Text style={s.eventText}>
            <Text style={s.eventLabel}>Event Date: </Text>
            {event.eventDate}
          </Text>
          <Text style={s.eventText}>
            <Text style={s.eventLabel}>Client: </Text>
            {client.shopName}
            {client.ownerName ? ` (${client.ownerName})` : ""}
          </Text>
          {client.phone && (
            <Text style={s.eventText}>
              <Text style={s.eventLabel}>Phone: </Text>
              {client.phone}
            </Text>
          )}
          {client.address && (
            <Text style={s.eventText}>{client.address}</Text>
          )}
        </View>

        {/* Table */}
        <View style={s.table}>
          <View style={s.tableHeaderRow}>
            <Text style={s.thSno}>S.No</Text>
            <Text style={s.thItem}>Menu Item</Text>
            <Text style={s.thQty}>Qty</Text>
            <Text style={s.thRate}>Rate</Text>
            <Text style={s.thAmt}>Amt</Text>
          </View>
          {items.map((item, idx) => (
            <View style={s.tableRow} key={idx}>
              <Text style={s.tdSno}>{idx + 1}</Text>
              <Text style={s.tdItem}>{item.productName}</Text>
              <Text style={s.tdQty}>{item.quantity}</Text>
              <Text style={s.tdRate}>{formatINR(item.rate)}</Text>
              <Text style={s.tdAmt}>{formatINR(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsSection}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal:</Text>
            <Text style={s.totalValue}>{formatINR(invoice.subtotal)}</Text>
          </View>
          {invoice.advancePaid > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Advance Paid:</Text>
              <Text style={s.totalValue}>
                -{formatINR(invoice.advancePaid)}
              </Text>
            </View>
          )}
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>BALANCE DUE:</Text>
            <Text style={s.grandTotalValue}>
              {formatINR(invoice.balanceDue)}
            </Text>
          </View>
        </View>

        {/* Signature */}
        {signatureUrl ? (
          <View style={s.signatureSection}>
            <Image src={signatureUrl} style={s.signatureImage} />
            <Text style={s.signatureLabel}>Authorized Signatory</Text>
          </View>
        ) : (
          <View style={s.signatureSection}>
            <Text style={s.signatureLabel}>Authorized Signatory</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
