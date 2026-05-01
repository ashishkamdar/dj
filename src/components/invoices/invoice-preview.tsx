"use client";

import { Card, CardBody } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { amountToWords } from "@/lib/amount-words";

interface InvoicePreviewProps {
  firm: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    gstNumber: string | null;
    stateCode: string | null;
    bankName: string | null;
    bankAccount: string | null;
    bankIfsc: string | null;
  };
  client: {
    shopName: string;
    ownerName: string | null;
    phone: string | null;
    address: string | null;
    gstNumber: string | null;
  };
  order: {
    date: string;
    billingType: string;
    eventName: string | null;
    eventDate: string | null;
    advancePaid: number | null;
  };
  items: {
    productName: string;
    quantity: number;
    unit: string | null;
    rate: number;
    amount: number;
    hsnCode: string | null;
    gstRatePercent: number | null;
  }[];
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  total: number;
  balanceBf: number;
  grandTotal: number;
  invoiceNumber?: string;
}

export function InvoicePreview({
  firm,
  client,
  order,
  items,
  subtotal,
  cgstAmount,
  sgstAmount,
  total,
  balanceBf,
  grandTotal,
  invoiceNumber,
}: InvoicePreviewProps) {
  const isGst = order.billingType === "gst";
  const isCatering = order.billingType === "catering";
  const advancePaid = order.advancePaid ?? 0;
  const balanceDue = isCatering ? grandTotal - advancePaid : grandTotal;
  const cgstRate =
    subtotal > 0 ? ((cgstAmount / subtotal) * 100).toFixed(1) : "0";
  const sgstRate =
    subtotal > 0 ? ((sgstAmount / subtotal) * 100).toFixed(1) : "0";

  return (
    <Card className="mx-auto max-w-2xl">
      <CardBody className="space-y-5">
        {/* Firm header */}
        <div className="border-b border-gray-200 pb-4 text-center dark:border-white/10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {firm.name}
          </h2>
          {firm.address && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {firm.address}
            </p>
          )}
          <div className="mt-1 flex flex-wrap justify-center gap-x-3 text-xs text-gray-500 dark:text-gray-400">
            {firm.phone && <span>Ph: {firm.phone}</span>}
            {firm.email && <span>{firm.email}</span>}
          </div>
          {firm.gstNumber && (
            <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              GSTIN: {firm.gstNumber}
            </p>
          )}
        </div>

        {/* Invoice info + Bill To */}
        <div className="flex justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Bill To
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {client.shopName}
            </p>
            {client.ownerName && (
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {client.ownerName}
              </p>
            )}
            {client.address && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {client.address}
              </p>
            )}
            {client.phone && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ph: {client.phone}
              </p>
            )}
            {client.gstNumber && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                GSTIN: {client.gstNumber}
              </p>
            )}
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Invoice
            </p>
            {invoiceNumber && (
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                #{invoiceNumber}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Date: {formatDate(order.date)}
            </p>
          </div>
        </div>

        {/* Catering event details */}
        {isCatering && (order.eventName || order.eventDate) && (
          <div className="rounded-md bg-purple-50 px-3 py-2 dark:bg-purple-500/10">
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
              Event Details
            </p>
            {order.eventName && (
              <p className="text-sm text-purple-900 dark:text-purple-200">
                {order.eventName}
              </p>
            )}
            {order.eventDate && (
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Event Date: {formatDate(order.eventDate)}
              </p>
            )}
          </div>
        )}

        {/* Items table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="pb-2 pr-2 text-left font-medium">#</th>
                <th className="pb-2 pr-2 text-left font-medium">Item</th>
                {isGst && (
                  <th className="pb-2 pr-2 text-left font-medium">HSN</th>
                )}
                <th className="pb-2 pr-2 text-right font-medium">Qty</th>
                <th className="pb-2 pr-2 text-left font-medium">Unit</th>
                <th className="pb-2 pr-2 text-right font-medium">Rate</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-2 text-gray-500 dark:text-gray-400">
                    {idx + 1}
                  </td>
                  <td className="py-2 pr-2 text-gray-900 dark:text-white">
                    {item.productName}
                  </td>
                  {isGst && (
                    <td className="py-2 pr-2 text-gray-500 dark:text-gray-400">
                      {item.hsnCode ?? "-"}
                    </td>
                  )}
                  <td className="py-2 pr-2 text-right text-gray-700 dark:text-gray-300">
                    {item.quantity}
                  </td>
                  <td className="py-2 pr-2 text-gray-500 dark:text-gray-400">
                    {item.unit ?? "kg"}
                  </td>
                  <td className="py-2 pr-2 text-right text-gray-700 dark:text-gray-300">
                    {formatCurrency(item.rate)}
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="space-y-1 border-t border-gray-200 pt-3 dark:border-white/10">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-white">
              {formatCurrency(subtotal)}
            </span>
          </div>
          {isGst && cgstAmount > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  CGST @{cgstRate}%
                </span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(cgstAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  SGST @{sgstRate}%
                </span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(sgstAmount)}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-1 text-sm font-semibold dark:border-white/10">
            <span className="text-gray-900 dark:text-white">Total</span>
            <span className="text-gray-900 dark:text-white">
              {formatCurrency(total)}
            </span>
          </div>
          {balanceBf !== 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Balance B/F
              </span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(balanceBf)}
              </span>
            </div>
          )}
          {balanceBf !== 0 && (
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-900 dark:text-white">Grand Total</span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          )}

          {/* Catering: advance & balance due */}
          {isCatering && advancePaid > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Advance Paid
                </span>
                <span className="text-green-600 dark:text-green-400">
                  - {formatCurrency(advancePaid)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-900 dark:text-white">
                  Balance Due
                </span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(balanceDue)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Amount in words */}
        <div className="border-t border-gray-200 pt-3 dark:border-white/10">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Amount in words:</span>{" "}
            {amountToWords(isCatering && advancePaid > 0 ? balanceDue : grandTotal)}
          </p>
        </div>

        {/* Bank details */}
        {firm.bankName && (
          <div className="border-t border-gray-200 pt-3 dark:border-white/10">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Bank Details
            </p>
            <div className="mt-1 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
              <p>Bank: {firm.bankName}</p>
              {firm.bankAccount && <p>A/C: {firm.bankAccount}</p>}
              {firm.bankIfsc && <p>IFSC: {firm.bankIfsc}</p>}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
