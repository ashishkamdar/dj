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
  // Indian grouping: last 3, then every 2
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
export interface NonGstInvoiceProps {
  invoice: {
    invoiceNumber: string;
    date: string;
    subtotal: number;
    balanceBf: number;
    grandTotal: number;
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
  items: {
    productName: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  }[];
  signatureUrl?: string;
}

// ── Page dimensions in points ─────────────────────────────────────────────
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
      marginBottom: isA6 ? 4 : 8,
    },
    metaText: {
      fontSize: fs.body,
    },
    sectionTitle: {
      fontSize: fs.body,
      fontFamily: "Helvetica-Bold",
      marginBottom: 2,
    },
    clientSection: {
      marginBottom: isA6 ? 6 : 10,
      borderBottomWidth: 0.5,
      borderBottomColor: "#ccc",
      paddingBottom: isA6 ? 4 : 8,
    },
    clientText: {
      fontSize: fs.body,
      marginBottom: 1,
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
    thParticular: { width: "37%", paddingLeft: 4, fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thQty: { width: "12%", textAlign: "center", fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thUnit: { width: "13%", textAlign: "center", fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thRate: { width: "15%", textAlign: "right", fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thAmt: { width: "15%", textAlign: "right", paddingRight: 4, fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    tdSno: { width: "8%", textAlign: "center", fontSize: fs.tableCell } as Style,
    tdParticular: { width: "37%", paddingLeft: 4, fontSize: fs.tableCell } as Style,
    tdQty: { width: "12%", textAlign: "center", fontSize: fs.tableCell } as Style,
    tdUnit: { width: "13%", textAlign: "center", fontSize: fs.tableCell } as Style,
    tdRate: { width: "15%", textAlign: "right", fontSize: fs.tableCell } as Style,
    tdAmt: { width: "15%", textAlign: "right", paddingRight: 4, fontSize: fs.tableCell } as Style,
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
      width: 100,
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
      width: 100,
      textAlign: "right",
      marginRight: 8,
    },
    grandTotalValue: {
      fontSize: fs.grandTotal,
      fontFamily: "Helvetica-Bold",
      width: 80,
      textAlign: "right",
    },
    // ── Footer ──
    bankSection: {
      borderTopWidth: 1,
      borderTopColor: "#333",
      paddingTop: isA6 ? 4 : 8,
      marginTop: "auto",
    },
    bankTitle: {
      fontSize: fs.body,
      fontFamily: "Helvetica-Bold",
      marginBottom: 2,
    },
    bankText: {
      fontSize: fs.small,
      color: "#555",
      marginBottom: 1,
    },
    signatureSection: {
      alignItems: "flex-end",
      marginTop: isA6 ? 6 : 12,
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
export function NonGstInvoice({
  invoice,
  firm,
  client,
  items,
  signatureUrl,
}: NonGstInvoiceProps) {
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

        {/* Client */}
        <View style={s.clientSection}>
          <Text style={s.sectionTitle}>Bill To:</Text>
          <Text style={s.clientText}>{client.shopName}</Text>
          {(client.ownerName || client.phone) && (
            <Text style={s.clientText}>
              {[client.ownerName, client.phone].filter(Boolean).join("  |  ")}
            </Text>
          )}
          {client.address ? (
            <Text style={s.clientText}>{client.address}</Text>
          ) : null}
        </View>

        {/* Table */}
        <View style={s.table}>
          {/* Header row */}
          <View style={s.tableHeaderRow}>
            <Text style={s.thSno}>S.No</Text>
            <Text style={s.thParticular}>Particular</Text>
            <Text style={s.thQty}>Qty</Text>
            <Text style={s.thUnit}>Unit</Text>
            <Text style={s.thRate}>Rate</Text>
            <Text style={s.thAmt}>Amt</Text>
          </View>
          {/* Data rows */}
          {items.map((item, idx) => (
            <View style={s.tableRow} key={idx}>
              <Text style={s.tdSno}>{idx + 1}</Text>
              <Text style={s.tdParticular}>{item.productName}</Text>
              <Text style={s.tdQty}>{item.quantity}</Text>
              <Text style={s.tdUnit}>{item.unit}</Text>
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
          {invoice.balanceBf !== 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Balance B/F:</Text>
              <Text style={s.totalValue}>{formatINR(invoice.balanceBf)}</Text>
            </View>
          )}
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>TOTAL DUE:</Text>
            <Text style={s.grandTotalValue}>
              {formatINR(invoice.grandTotal)}
            </Text>
          </View>
        </View>

        {/* Bank details */}
        {(firm.bankName || firm.bankAccount) && (
          <View style={s.bankSection}>
            <Text style={s.bankTitle}>Bank Details:</Text>
            {firm.bankName && (
              <Text style={s.bankText}>Bank: {firm.bankName}</Text>
            )}
            {firm.bankAccount && (
              <Text style={s.bankText}>A/C: {firm.bankAccount}</Text>
            )}
            {firm.bankIfsc && (
              <Text style={s.bankText}>IFSC: {firm.bankIfsc}</Text>
            )}
          </View>
        )}

        {/* Signature */}
        {signatureUrl && (
          <View style={s.signatureSection}>
            <Image src={signatureUrl} style={s.signatureImage} />
            <Text style={s.signatureLabel}>Authorized Signatory</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
