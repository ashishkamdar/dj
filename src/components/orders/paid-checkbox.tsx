"use client";

import { useState, useTransition } from "react";
import { markOrderPaid } from "@/actions/orders";
import { cn } from "@/lib/utils";

interface PaidCheckboxProps {
  orderId: number;
  initialPaid: boolean;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function PaidCheckbox({
  orderId,
  initialPaid,
  size = "md",
  showLabel = false,
}: PaidCheckboxProps) {
  const [isPending, startTransition] = useTransition();
  const [paid, setPaid] = useState(initialPaid);

  function toggle(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    const next = e.target.checked;
    setPaid(next);
    startTransition(async () => {
      try {
        await markOrderPaid(orderId, next);
      } catch (err) {
        // Revert on error
        setPaid(!next);
        console.error(err);
      }
    });
  }

  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 select-none",
        isPending && "opacity-50",
      )}
    >
      <input
        type="checkbox"
        checked={paid}
        disabled={isPending}
        onChange={toggle}
        className={cn(
          "rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5",
          size === "sm" ? "size-3.5" : "size-4",
        )}
      />
      {showLabel && (
        <span
          className={cn(
            "text-xs font-medium",
            paid
              ? "text-green-600 dark:text-green-400"
              : "text-gray-500 dark:text-gray-400",
          )}
        >
          {paid ? "Paid" : "Unpaid"}
        </span>
      )}
    </label>
  );
}
