import { renderToBuffer } from "@react-pdf/renderer";
import { adminDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import React from "react";
import fs from "fs";
import path from "path";
import {
  NonGstInvoice,
  type NonGstInvoiceProps,
} from "@/components/invoices/pdf-templates/non-gst-invoice";
import {
  GstInvoice,
  type GstInvoiceProps,
} from "@/components/invoices/pdf-templates/gst-invoice";
import {
  CateringInvoice,
  type CateringInvoiceProps,
} from "@/components/invoices/pdf-templates/catering-invoice";

/**
 * Format a date string (YYYY-MM-DD) to "20 Apr 2026" style.
 * We avoid Intl here since this may run in restricted environments.
 */
function fmtDate(dateStr: string): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Read the signature file from disk and convert to a base64 data URL.
 */
function getSignatureDataUrl(signaturePath: string): string | undefined {
  if (!signaturePath) return undefined;
  // signaturePath is like "/api/settings/signature/signature-1-123.png"
  const filename = signaturePath.split("/").pop();
  if (!filename) return undefined;
  const filePath = path.join(
    process.cwd(),
    "data",
    "uploads",
    "signatures",
    filename,
  );
  if (!fs.existsSync(filePath)) return undefined;
  const buffer = fs.readFileSync(filePath);
  const ext = filename.split(".").pop() || "png";
  return `data:image/${ext};base64,${buffer.toString("base64")}`;
}

/**
 * Render a PDF buffer for the given invoice ID.
 * Loads all related data from the DB and picks the correct template.
 */
export async function renderInvoicePDF(tenantId: number, invoiceId: number): Promise<Buffer> {
  // Load invoice
  const invoiceRows = await adminDb
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.id, invoiceId));
  const invoice = invoiceRows[0];
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  // Load related records
  const orderRows = await adminDb
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, invoice.orderId));
  const order = orderRows[0];
  if (!order) throw new Error(`Order ${invoice.orderId} not found`);

  const firmRows = await adminDb
    .select()
    .from(schema.firms)
    .where(eq(schema.firms.id, invoice.firmId));
  const firm = firmRows[0];
  if (!firm) throw new Error(`Firm ${invoice.firmId} not found`);

  const clientRows = await adminDb
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.id, invoice.clientId));
  const client = clientRows[0];
  if (!client) throw new Error(`Client ${invoice.clientId} not found`);

  // Load order items with product details
  const rawItems = await adminDb
    .select({
      quantity: schema.orderItems.quantity,
      unit: schema.orderItems.unit,
      rate: schema.orderItems.rate,
      amount: schema.orderItems.amount,
      productName: schema.products.name,
      hsnCode: schema.products.hsnCode,
    })
    .from(schema.orderItems)
    .innerJoin(
      schema.products,
      eq(schema.orderItems.productId, schema.products.id)
    )
    .where(eq(schema.orderItems.orderId, invoice.orderId));

  // Resolve signature image to base64 data URL for PDF embedding
  const signatureUrl = getSignatureDataUrl(firm.signature ?? "");

  const dateFormatted = fmtDate(invoice.date);
  const size = (invoice.size ?? "A4") as "A6" | "A4";

  // Determine template
  const billingType = order.billingType;

  if (billingType === "gst") {
    const props: GstInvoiceProps = {
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        date: dateFormatted,
        subtotal: invoice.subtotal,
        cgstAmount: invoice.cgstAmount ?? 0,
        sgstAmount: invoice.sgstAmount ?? 0,
        igstAmount: invoice.igstAmount ?? 0,
        total: invoice.total,
        balanceBf: invoice.balanceBf ?? 0,
        grandTotal: invoice.grandTotal,
        size,
      },
      firm: {
        name: firm.name,
        address: firm.address ?? "",
        phone: firm.phone ?? "",
        email: firm.email ?? "",
        gstNumber: firm.gstNumber ?? "",
        stateCode: firm.stateCode ?? "",
        bankName: firm.bankName ?? "",
        bankAccount: firm.bankAccount ?? "",
        bankIfsc: firm.bankIfsc ?? "",
        logo: firm.logo ?? undefined,
      },
      client: {
        shopName: client.shopName,
        ownerName: client.ownerName ?? "",
        phone: client.phone ?? "",
        address: client.address ?? "",
        gstNumber: client.gstNumber ?? undefined,
      },
      items: rawItems.map((i) => ({
        productName: i.productName,
        hsnCode: i.hsnCode ?? "",
        quantity: i.quantity,
        unit: i.unit ?? "kg",
        rate: i.rate,
        amount: i.amount,
      })),
      signatureUrl,
    };
    const element = React.createElement(GstInvoice, props);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await renderToBuffer(element as any)) as Buffer;
  }

  if (billingType === "catering") {
    const props: CateringInvoiceProps = {
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        date: dateFormatted,
        subtotal: invoice.subtotal,
        advancePaid: order.advancePaid ?? 0,
        balanceDue: invoice.grandTotal,
        size,
      },
      firm: {
        name: firm.name,
        address: firm.address ?? "",
        phone: firm.phone ?? "",
        email: firm.email ?? "",
        bankName: firm.bankName ?? "",
        bankAccount: firm.bankAccount ?? "",
        bankIfsc: firm.bankIfsc ?? "",
        logo: firm.logo ?? undefined,
      },
      client: {
        shopName: client.shopName,
        ownerName: client.ownerName ?? "",
        phone: client.phone ?? "",
        address: client.address ?? "",
      },
      event: {
        eventName: order.eventName ?? "Event",
        eventDate: order.eventDate ? fmtDate(order.eventDate) : dateFormatted,
      },
      items: rawItems.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        rate: i.rate,
        amount: i.amount,
      })),
      signatureUrl,
    };
    const element = React.createElement(CateringInvoice, props);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await renderToBuffer(element as any)) as Buffer;
  }

  // Default: non-gst
  const props: NonGstInvoiceProps = {
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      date: dateFormatted,
      subtotal: invoice.subtotal,
      balanceBf: invoice.balanceBf ?? 0,
      grandTotal: invoice.grandTotal,
      size,
    },
    firm: {
      name: firm.name,
      address: firm.address ?? "",
      phone: firm.phone ?? "",
      email: firm.email ?? "",
      bankName: firm.bankName ?? "",
      bankAccount: firm.bankAccount ?? "",
      bankIfsc: firm.bankIfsc ?? "",
      logo: firm.logo ?? undefined,
    },
    client: {
      shopName: client.shopName,
      ownerName: client.ownerName ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
    },
    items: rawItems.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unit: i.unit ?? "kg",
      rate: i.rate,
      amount: i.amount,
    })),
    signatureUrl,
  };
  const element = React.createElement(NonGstInvoice, props);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await renderToBuffer(element as any)) as Buffer;
}
