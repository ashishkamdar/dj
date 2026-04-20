"use client";

import { useState, useRef } from "react";

interface SignatureUploadProps {
  firmId: number;
  currentSignature?: string;
}

export function SignatureUpload({
  firmId,
  currentSignature,
}: SignatureUploadProps) {
  const [signature, setSignature] = useState(currentSignature || "");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("signature", file);
      formData.append("firmId", String(firmId));

      const res = await fetch("/api/settings/signature", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setSignature(data.path);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setMessage({ type: "success", text: "Signature uploaded successfully" });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Upload failed",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
        Signature for Invoices
      </h3>

      {/* Current signature */}
      {signature && !preview && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Current signature:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signature}
            alt="Current signature"
            className="h-16 border border-gray-200 dark:border-gray-700 rounded bg-white p-1"
          />
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Preview:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Signature preview"
            className="h-16 border border-gray-200 dark:border-gray-700 rounded bg-white p-1"
          />
        </div>
      )}

      {/* File input and upload button */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/70"
        />
        {preview && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <p
          className={`mt-3 text-sm ${
            message.type === "success"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
