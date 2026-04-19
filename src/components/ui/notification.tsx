"use client";

import { useEffect } from "react";
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export interface NotificationProps {
  type: "success" | "error";
  title: string;
  message?: string;
  onClose: () => void;
  className?: string;
}

export function Notification({
  type,
  title,
  message,
  onClose,
  className,
}: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const Icon = type === "success" ? CheckCircleIcon : XCircleIcon;

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-[100] w-full max-w-sm rounded-lg bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10",
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="shrink-0">
            <Icon
              className={cn(
                "size-6",
                type === "success"
                  ? "text-green-400 dark:text-green-500"
                  : "text-red-400 dark:text-red-500"
              )}
              aria-hidden="true"
            />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {title}
            </p>
            {message && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {message}
              </p>
            )}
          </div>
          <div className="ml-4 flex shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
