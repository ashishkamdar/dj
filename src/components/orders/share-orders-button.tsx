"use client";

import { useState } from "react";
import { ShareIcon, CheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface ShareOrdersButtonProps {
  summaryText: string;
}

export function ShareOrdersButton({ summaryText }: ShareOrdersButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // Try native share API first (mobile — opens WhatsApp etc.)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: summaryText });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: prompt-based copy
      window.prompt("Copy this text:", summaryText);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleShare}>
      {copied ? (
        <>
          <CheckIcon className="mr-1.5 size-4 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <ShareIcon className="mr-1.5 size-4" />
          Share to Factory
        </>
      )}
    </Button>
  );
}
