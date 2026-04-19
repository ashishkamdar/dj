import Link from "next/link";
import { EyeIcon, ShareIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface OrderItem {
  name: string;
  quantity: number;
  unit: string | null;
}

interface OrderCardProps {
  id: number;
  shopName: string | null;
  items: OrderItem[];
  totalAmount: number;
  status: string | null;
  billingType: string;
}

const statusColor: Record<string, "gray" | "blue" | "green"> = {
  draft: "gray",
  confirmed: "blue",
  invoiced: "green",
};

const billingTypeColor: Record<string, "indigo" | "gray" | "purple"> = {
  gst: "indigo",
  "non-gst": "gray",
  catering: "purple",
};

const billingTypeLabel: Record<string, string> = {
  gst: "GST",
  "non-gst": "Non-GST",
  catering: "Catering",
};

export function OrderCard({
  id,
  shopName,
  items,
  totalAmount,
  status,
  billingType,
}: OrderCardProps) {
  // Build items summary: first 2 items + "+N more"
  const summaryParts = items.slice(0, 2).map((i) => {
    const unit = i.unit ?? "kg";
    return `${i.name} ${i.quantity}${unit}`;
  });
  const moreCount = items.length - 2;
  const itemsSummary =
    summaryParts.join(", ") +
    (moreCount > 0 ? `, +${moreCount} more` : "");

  const resolvedStatus = status ?? "draft";

  return (
    <div className="rounded-lg bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {shopName ?? "Unknown Client"}
          </p>
          {items.length > 0 && (
            <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
              {itemsSummary}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatCurrency(totalAmount)}
            </span>
            <Badge color={billingTypeColor[billingType] ?? "gray"}>
              {billingTypeLabel[billingType] ?? billingType}
            </Badge>
            <Badge color={statusColor[resolvedStatus] ?? "gray"}>
              {resolvedStatus.charAt(0).toUpperCase() + resolvedStatus.slice(1)}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/orders/${id}`}
            className="rounded p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <EyeIcon className="size-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
          </Link>
          <button
            type="button"
            className="rounded p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Share via WhatsApp"
          >
            <ShareIcon className="size-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
