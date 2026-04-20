import { requireAdmin } from "@/lib/session";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getClientBalance } from "@/lib/ledger";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { InvoiceActions } from "@/components/invoices/invoice-actions";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id: idStr } = await params;
  const orderId = parseInt(idStr, 10);
  if (isNaN(orderId)) notFound();

  // Load order
  const order = db
    .select({
      id: schema.orders.id,
      date: schema.orders.date,
      clientId: schema.orders.clientId,
      firmId: schema.orders.firmId,
      billingType: schema.orders.billingType,
      status: schema.orders.status,
      eventName: schema.orders.eventName,
      eventDate: schema.orders.eventDate,
      advancePaid: schema.orders.advancePaid,
    })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .get();

  if (!order) notFound();

  // Load firm
  const firm = db
    .select()
    .from(schema.firms)
    .where(eq(schema.firms.id, order.firmId))
    .get();
  if (!firm) notFound();

  // Load client
  const client = db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.id, order.clientId))
    .get();
  if (!client) notFound();

  // Load order items with product details
  const orderItems = db
    .select({
      id: schema.orderItems.id,
      productId: schema.orderItems.productId,
      quantity: schema.orderItems.quantity,
      unit: schema.orderItems.unit,
      rate: schema.orderItems.rate,
      amount: schema.orderItems.amount,
      productName: schema.products.name,
      hsnCode: schema.products.hsnCode,
      gstRatePercent: schema.products.gstRatePercent,
    })
    .from(schema.orderItems)
    .leftJoin(
      schema.products,
      eq(schema.orderItems.productId, schema.products.id)
    )
    .where(eq(schema.orderItems.orderId, orderId))
    .all();

  // Check if invoice already exists
  const existingInvoice = db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.orderId, orderId))
    .get();

  // Calculate totals (same logic as createInvoice action)
  const subtotal = orderItems.reduce((sum, item) => sum + item.amount, 0);

  let cgstAmount = 0;
  let sgstAmount = 0;

  if (order.billingType === "gst" && firm.isGstRegistered) {
    const firmCgst = firm.cgstPercent ?? 0;
    const firmSgst = firm.sgstPercent ?? 0;
    if (firmCgst > 0 || firmSgst > 0) {
      cgstAmount = (subtotal * firmCgst) / 100;
      sgstAmount = (subtotal * firmSgst) / 100;
    }
  }

  const total = subtotal + cgstAmount + sgstAmount;
  const balanceBf = getClientBalance(order.clientId);
  const grandTotal = total + balanceBf;

  const previewItems = orderItems.map((item) => ({
    productName: item.productName ?? "Unknown",
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    amount: item.amount,
    hsnCode: item.hsnCode ?? null,
    gstRatePercent: item.gstRatePercent ?? null,
  }));

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/orders/${orderId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Order
        </Link>
        <div className="mt-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Invoice for Order #{orderId}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Client: {client.shopName} &middot; {formatDate(order.date)}
          </p>
        </div>

        {existingInvoice && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge color="green">Generated</Badge>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              #{existingInvoice.invoiceNumber}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              &middot; {formatDate(existingInvoice.date)}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              &middot; {formatCurrency(existingInvoice.grandTotal)}
            </span>
          </div>
        )}
      </div>

      {/* Invoice Preview */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          {existingInvoice ? "Invoice" : "Invoice Preview"}
        </h2>
        <InvoicePreview
          firm={{
            name: firm.name,
            address: firm.address ?? null,
            phone: firm.phone ?? null,
            email: firm.email ?? null,
            gstNumber: firm.gstNumber ?? null,
            stateCode: firm.stateCode ?? null,
            bankName: firm.bankName ?? null,
            bankAccount: firm.bankAccount ?? null,
            bankIfsc: firm.bankIfsc ?? null,
          }}
          client={{
            shopName: client.shopName,
            ownerName: client.ownerName ?? null,
            phone: client.phone ?? null,
            address: client.address ?? null,
            gstNumber: client.gstNumber ?? null,
          }}
          order={{
            date: order.date,
            billingType: order.billingType,
            eventName: order.eventName ?? null,
            eventDate: order.eventDate ?? null,
            advancePaid: order.advancePaid ?? null,
          }}
          items={previewItems}
          subtotal={existingInvoice?.subtotal ?? subtotal}
          cgstAmount={existingInvoice?.cgstAmount ?? cgstAmount}
          sgstAmount={existingInvoice?.sgstAmount ?? sgstAmount}
          total={existingInvoice?.total ?? total}
          balanceBf={existingInvoice?.balanceBf ?? balanceBf}
          grandTotal={existingInvoice?.grandTotal ?? grandTotal}
          invoiceNumber={existingInvoice?.invoiceNumber}
        />
      </div>

      {/* Actions */}
      <InvoiceActions
        orderId={orderId}
        invoiceId={existingInvoice?.id}
        invoiceNumber={existingInvoice?.invoiceNumber}
      />
    </div>
  );
}
