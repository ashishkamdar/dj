"use client";

import { useState } from "react";
import { CalendarDaysIcon, CheckIcon } from "@heroicons/react/24/outline";

interface SyncCalendarButtonProps {
  icsContent: string;
  filename: string;
  label?: string;
}

export function SyncCalendarButton({
  icsContent,
  filename,
  label = "Sync to Calendar",
}: SyncCalendarButtonProps) {
  const [synced, setSynced] = useState(false);

  function handleSync() {
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSynced(true);
    setTimeout(() => setSynced(false), 3000);
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50 dark:bg-white/10 dark:text-gray-300 dark:ring-white/10 dark:hover:bg-white/20"
    >
      {synced ? (
        <>
          <CheckIcon className="size-4 text-green-500" />
          Downloaded
        </>
      ) : (
        <>
          <CalendarDaysIcon className="size-4" />
          {label}
        </>
      )}
    </button>
  );
}
