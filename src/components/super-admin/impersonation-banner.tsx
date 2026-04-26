"use client";

import { useEffect, useState } from "react";

interface SessionData {
  impersonating?: boolean;
  tenantName?: string;
}

export function ImpersonationBanner() {
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    // Read the kp-session cookie and decode it
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith("kp-session="));
    if (!cookie) return;

    try {
      const value = cookie.split("=")[1];
      const payload = JSON.parse(atob(value));
      if (payload.impersonating) {
        setSession({ impersonating: true });
      }
    } catch {
      // ignore
    }
  }, []);

  if (!session?.impersonating) return null;

  function handleExit() {
    // Clear the kp-session cookie
    document.cookie = "kp-session=; path=/; max-age=0";
    window.location.href = "/super-admin";
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-4 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-md">
      <span>You are viewing as an impersonated tenant</span>
      <button
        onClick={handleExit}
        className="rounded-md bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors"
      >
        Exit
      </button>
    </div>
  );
}
