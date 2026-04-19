"use client";

import { useTransition } from "react";
import { updateItemStatus } from "@/actions/order-items";
import { cn } from "@/lib/utils";

const STATUSES = ["received", "cooking", "cooked", "packed"] as const;
type ItemStatus = (typeof STATUSES)[number];

const statusColors: Record<
  ItemStatus,
  { active: string; inactive: string }
> = {
  received: {
    active:
      "bg-gray-500 text-white ring-gray-500",
    inactive:
      "text-gray-500 ring-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:ring-gray-600 dark:hover:bg-gray-800",
  },
  cooking: {
    active:
      "bg-yellow-500 text-white ring-yellow-500",
    inactive:
      "text-yellow-600 ring-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:ring-yellow-600 dark:hover:bg-yellow-900/20",
  },
  cooked: {
    active:
      "bg-blue-500 text-white ring-blue-500",
    inactive:
      "text-blue-600 ring-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:ring-blue-600 dark:hover:bg-blue-900/20",
  },
  packed: {
    active:
      "bg-green-500 text-white ring-green-500",
    inactive:
      "text-green-600 ring-green-300 hover:bg-green-50 dark:text-green-400 dark:ring-green-600 dark:hover:bg-green-900/20",
  },
};

const statusLabel: Record<ItemStatus, string> = {
  received: "Received",
  cooking: "Cooking",
  cooked: "Cooked",
  packed: "Packed",
};

interface StatusUpdaterProps {
  items: {
    id: number;
    productName: string;
    quantity: number;
    unit: string;
    itemStatus: string;
  }[];
}

export function OrderStatusUpdater({ items }: StatusUpdaterProps) {
  return (
    <div className="divide-y divide-gray-200 rounded-lg bg-white shadow-sm ring-1 ring-black/5 dark:divide-gray-700 dark:bg-gray-800/50 dark:ring-white/10">
      {items.map((item) => (
        <StatusRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function StatusRow({
  item,
}: {
  item: {
    id: number;
    productName: string;
    quantity: number;
    unit: string;
    itemStatus: string;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const currentStatus = (item.itemStatus || "received") as ItemStatus;

  function handleStatusChange(newStatus: ItemStatus) {
    if (newStatus === currentStatus) return;
    startTransition(async () => {
      await updateItemStatus(item.id, newStatus);
    });
  }

  return (
    <div
      className={cn("px-4 py-3", isPending && "opacity-60")}
    >
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {item.productName}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {item.quantity} {item.unit}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((status) => {
          const isActive = status === currentStatus;
          const colors = statusColors[status];
          return (
            <button
              key={status}
              type="button"
              disabled={isPending}
              onClick={() => handleStatusChange(status)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
                isActive ? colors.active : colors.inactive,
                isPending && "cursor-not-allowed"
              )}
            >
              {isActive ? "●" : "○"} {statusLabel[status]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
