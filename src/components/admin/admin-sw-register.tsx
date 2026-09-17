"use client";

import { useEffect } from "react";

/**
 * AdminServiceWorkerRegister — registers /admin-sw.js with scope "/admin/".
 *
 * NOTE: Previously this was production-only to avoid stale-cache issues
 * during development. It's now registered in ALL environments because
 * the SW also handles push notifications — admin push subscriptions
 * require the SW to be registered, and we want push to work in the
 * dev/preview environment for testing.
 *
 * The /admin-sw.js fetch handler is dev-safe: network-first for
 * navigations (always hits network in dev, so HMR keeps working),
 * cache-first only for fingerprinted static assets.
 */
export function AdminServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker
      .register("/admin-sw.js", { scope: "/admin/" })
      .catch((err) => {
        // Non-fatal — push + offline cache are best-effort features.
        console.warn("[admin-sw-register] /admin-sw.js registration failed:", err?.message || err);
      });
  }, []);
  return null;
}
