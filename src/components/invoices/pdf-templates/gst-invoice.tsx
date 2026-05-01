import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { amountToWords } from "@/lib/amount-words";

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
export interface GstInvoiceProps {
  invoice: {
    invoiceNumber: string;
    date: string;
    subtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    total: number;
    balanceBf: number;
    grandTotal: number;
    size: "A6" | "A4";
  };
  firm: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstNumber: string;
    stateCode: string;
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
    gstNumber?: string;
  };
  items: {
    productName: string;
    hsnCode: string;
    quantity: number;
    unit: string;
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
    tableHeader: isA6 ? 6 : 8,
    tableCell: isA6 ? 6 : 8,
    totalLabel: isA6 ? 7 : 10,
    grandTotal: isA6 ? 9 : 12,
    words: isA6 ? 6 : 9,
  };
  const p = isA6 ? 10 : 20;

  return StyleSheet.create({
    page: {
      padding: p,
      fontFamily: "Helvetica",
      fontSize: fs.body,
    },
    taxInvoiceLabel: {
      fontSize: isA6 ? 8 : 12,
      fontFamily: "Helvetica-Bold",
      textAlign: "center",
      marginBottom: 2,
      textDecoration: "underline",
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
      marginBottom: 1,
    },
    gstLabel: {
      fontSize: fs.small,
      fontFamily: "Helvetica-Bold",
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
    thSno: { width: "6%", textAlign: "center", fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thParticular: { width: "27%", paddingLeft: 4, fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thHsn: { width: "10%", textAlign: "center", fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thQty: { width: "10%", textAlign: "center", fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thUnit: { width: "10%", textAlign: "center", fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thRate: { width: "17%", textAlign: "right", fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    thAmt: { width: "20%", textAlign: "right", paddingRight: 4, fontSize: fs.tableHeader, fontFamily: "Helvetica-Bold" } as Style,
    tdSno: { width: "6%", textAlign: "center", fontSize: fs.tableCell } as Style,
    tdParticular: { width: "27%", paddingLeft: 4, fontSize: fs.tableCell } as Style,
    tdHsn: { width: "10%", textAlign: "center", fontSize: fs.tableCell } as Style,
    tdQty: { width: "10%", textAlign: "center", fontSize: fs.tableCell } as Style,
    tdUnit: { width: "10%", textAlign: "center", fontSize: fs.tableCell } as Style,
    tdRate: { width: "17%", textAlign: "right", fontSize: fs.tableCell } as Style,
    tdAmt: { width: "20%", textAlign: "right", paddingRight: 4, fontSize: fs.tableCell } as Style,
    // ── Totals ──
    totalsSection: {
      alignItems: "flex-end",
      marginBottom: isA6 ? 4 : 8,
      paddingTop: isA6 ? 4 : 6,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 2,
    },
    totalLabel: {
      fontSize: fs.totalLabel,
      width: isA6 ? 90 : 140,
      textAlign: "right",
      marginRight: 8,
    },
    totalValue: {
      fontSize: fs.totalLabel,
      width: isA6 ? 70 : 100,
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
      width: isA6 ? 90 : 140,
      textAlign: "right",
      marginRight: 8,
    },
    grandTotalValue: {
      fontSize: fs.grandTotal,
      fontFamily: "Helvetica-Bold",
      width: isA6 ? 70 : 100,
      textAlign: "right",
    },
    // ── Words ──
    wordsSection: {
      marginBottom: isA6 ? 4 : 8,
      borderTopWidth: 0.5,
      borderTopColor: "#ccc",
      paddingTop: isA6 ? 3 : 6,
    },
    wordsText: {
      fontSize: fs.words,
      fontStyle: "italic",
    },
    // ── Bank & Signature ──
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
export function GstInvoice({
  invoice,
  firm,
  client,
  items,
  signatureUrl,
}: GstInvoiceProps) {
  const s = buildStyles(invoice.size);
  const pgSize = PAGE_SIZES[invoice.size];
  const cgstRate =
    invoice.subtotal > 0
      ? ((invoice.cgstAmount / invoice.subtotal) * 100).toFixed(1)
      : "0";
  const sgstRate =
    invoice.subtotal > 0
      ? ((invoice.sgstAmount / invoice.subtotal) * 100).toFixed(1)
      : "0";

  return (
    <Document>
      <Page size={[pgSize.width, pgSize.height]} style={s.page}>
        {/* Tax Invoice label */}
        <Text style={s.taxInvoiceLabel}>TAX INVOICE</Text>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.firmName}>{firm.name}</Text>
          <Text style={s.firmDetails}>
            {[firm.address, firm.phone, firm.email]
              .filter(Boolean)
              .join("  |  ")}
          </Text>
          {firm.gstNumber && (
            <Text style={s.gstLabel}>GSTIN: {firm.gstNumber}</Text>
          )}
        </View>

        {/* Invoice meta */}
        <View style={s.metaRow}>
          <Text style={s.metaText}>Invoice No: {invoice.invoiceNumber}</Text>
          <Text style={s.metaText}>Date: {invoice.date}</Text>
        </View>
        {firm.stateCode && (
          <View style={s.metaRow}>
            <Text style={s.metaText}>
              State: Gujarat ({firm.stateCode})
            </Text>
          </View>
        )}

        {/* Client */}
        <View style={s.clientSection}>
          <Text style={s.sectionTitle}>Bill To:</Text>
          <Text style={s.clientText}>
            {client.shopName}
            {client.gstNumber ? `  |  GSTIN: ${client.gstNumber}` : ""}
          </Text>
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
          <View style={s.tableHeaderRow}>
            <Text style={s.thSno}>S.No</Text>
            <Text style={s.thParticular}>Particular</Text>
            <Text style={s.thHsn}>HSN</Text>
            <Text style={s.thQty}>Qty</Text>
            <Text style={s.thUnit}>Unit</Text>
            <Text style={s.thRate}>Rate</Text>
            <Text style={s.thAmt}>Amt</Text>
          </View>
          {items.map((item, idx) => (
            <View style={s.tableRow} key={idx}>
              <Text style={s.tdSno}>{idx + 1}</Text>
              <Text style={s.tdParticular}>{item.productName}</Text>
              <Text style={s.tdHsn}>{item.hsnCode}</Text>
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
          {invoice.cgstAmount > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>CGST @{cgstRate}%:</Text>
              <Text style={s.totalValue}>
                {formatINR(invoice.cgstAmount)}
              </Text>
            </View>
          )}
          {invoice.sgstAmount > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>SGST @{sgstRate}%:</Text>
              <Text style={s.totalValue}>
                {formatINR(invoice.sgstAmount)}
              </Text>
            </View>
          )}
          {invoice.igstAmount > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>IGST:</Text>
              <Text style={s.totalValue}>
                {formatINR(invoice.igstAmount)}
              </Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total:</Text>
            <Text style={s.totalValue}>{formatINR(invoice.total)}</Text>
          </View>
          {invoice.balanceBf !== 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Balance B/F:</Text>
              <Text style={s.totalValue}>{formatINR(invoice.balanceBf)}</Text>
            </View>
          )}
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>GRAND TOTAL:</Text>
            <Text style={s.grandTotalValue}>
              {formatINR(invoice.grandTotal)}
            </Text>
          </View>
        </View>

        {/* Amount in words */}
        <View style={s.wordsSection}>
          <Text style={s.wordsText}>
            Amount in words: {amountToWords(invoice.grandTotal)}
          </Text>
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
