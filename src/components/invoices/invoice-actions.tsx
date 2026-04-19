"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createInvoice } from "@/actions/invoices";
import { useRouter } from "next/navigation";

interface InvoiceActionsProps {
  orderId: number;
  /** If set, invoice already exists */
  invoiceId?: number;
  invoiceNumber?: string;
  defaultSize?: "A4" | "A6";
}

export function InvoiceActions({
  orderId,
  invoiceId,
  invoiceNumber,
  defaultSize = "A6",
}: InvoiceActionsProps) {
  const [size, setSize] = useState<"A4" | "A6">(defaultSize);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = () => {
    setError(null);
    const formData = new FormData();
    formData.set("orderId", String(orderId));
    formData.set("size", size);

    startTransition(async () => {
      const result = await createInvoice(formData);
      if (result && "error" in result) {
        setError(result.error as string);
      } else {
        router.refresh();
      }
    });
  };

  const handleShare = async () => {
    if (!invoiceId) return;

    const pdfUrl = `${window.location.origin}/api/invoices/${invoiceId}/pdf`;
    const text = `Invoice ${invoiceNumber ?? ""} - Download: ${pdfUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoiceNumber ?? ""}`,
          text,
          url: pdfUrl,
        });
      } catch {
        // user cancelled or error — ignore
      }
    } else {
      // Fallback: open WhatsApp with text
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    }
  };

  if (invoiceId) {
    // Invoice exists: show download & share
    return (
      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/invoices/${invoiceId}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="primary">View PDF</Button>
        </a>
        <a
          href={`/api/invoices/${invoiceId}/pdf`}
          download={`invoice-${invoiceNumber ?? invoiceId}.pdf`}
        >
          <Button variant="secondary">Download PDF</Button>
        </a>
        <Button variant="soft" onClick={handleShare}>
          Share via WhatsApp
        </Button>
      </div>
    );
  }

  // Invoice doesn't exist: show size picker + generate
  return (
    <div className="space-y-4">
      {/* Size selection */}
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Invoice Size
        </p>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="size"
              value="A4"
              checked={size === "A4"}
              onChange={() => setSize("A4")}
              className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            <span className="text-sm text-gray-900 dark:text-white">
              A4 (Full Page)
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="size"
              value="A6"
              checked={size === "A6"}
              onChange={() => setSize("A6")}
              className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
            />
            <span className="text-sm text-gray-900 dark:text-white">
              A6 (Compact)
            </span>
          </label>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Generating..." : "Generate Invoice"}
      </Button>
    </div>
  );
}
