"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";

export function BackupRestoreForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "confirming" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleRestore() {
    if (!file) return;

    setStatus("uploading");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("backup", file);

      const response = await fetch("/api/backup/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Database restored successfully.");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to restore database.");
      }
    } catch {
      setStatus("error");
      setMessage("An error occurred while restoring the database.");
    }
  }

  function handleCancel() {
    setStatus("idle");
    setFile(null);
    setMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".db,.sqlite,.sqlite3"
          onChange={(e) => {
            const selected = e.target.files?.[0] || null;
            setFile(selected);
            setStatus("idle");
            setMessage("");
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 dark:text-gray-400 dark:file:bg-indigo-900/30 dark:file:text-indigo-400"
        />
      </div>

      {file && status === "idle" && (
        <div>
          <Button
            onClick={() => setStatus("confirming")}
          >
            <CloudArrowUpIcon className="size-4 mr-2" />
            Restore
          </Button>
        </div>
      )}

      {status === "confirming" && (
        <div className="rounded-md bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-800">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Are you sure you want to restore from this backup?
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            This will replace all current data. A backup of the current database
            will be saved automatically.
          </p>
          <div className="mt-3 flex gap-3">
            <Button
              onClick={handleRestore}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Yes, Restore
            </Button>
            <Button
              onClick={handleCancel}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {status === "uploading" && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Restoring database...
        </p>
      )}

      {status === "success" && (
        <div className="rounded-md bg-green-50 p-4 ring-1 ring-green-200 dark:bg-green-900/20 dark:ring-green-800">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            {message}
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-md bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
