"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Was the page already controlled by a SW before we registered? If so,
    // a later `controllerchange` means an UPDATE (new SW just took over) and
    // we should reload to pick up the latest assets. If not, this is a first
    // install — no reload needed.
    const wasControlled = !!navigator.serviceWorker.controller;
    let reloaded = false;

    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then(
      (reg) => {
        // Periodically check for updates while the app is open.
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      },
      () => {},
    );

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!wasControlled || reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    // Also check for an update whenever the tab becomes visible again — useful
    // when a PWA is resumed from the background.
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.update().catch(() => {});
      });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return null;
}
