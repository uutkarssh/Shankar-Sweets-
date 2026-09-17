"use client";

import { useEffect } from "react";

/**
 * Registers the customer service worker (/sw.js, scope "/").
 *
 * NOTE: Previously this was production-only to avoid stale-cache issues
 * during development. It's now registered in ALL environments because
 * the SW also handles push notifications — push subscriptions require
 * the SW to be registered, and we want push to work in the dev/preview
 * environment for testing.
 *
 * The /sw.js fetch handler is dev-safe: network-first for navigations
 * (always hits network in dev, so HMR keeps working), cache-first only
 * for fingerprinted static assets under /_next/static/ (URLs are
 * content-hashed, so stale cache == correct content for that hash).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    // Register in both dev and production. In dev this enables testing
    // push notifications; in production it enables both offline cache + push.
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      // Non-fatal — push + offline cache are best-effort features.
      console.warn("[sw-register] /sw.js registration failed:", err?.message || err);
    });
  }, []);
  return null;
}
