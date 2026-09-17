"use client";

import { useEffect } from "react";

/**
 * AdminServiceWorkerRegister — registers /admin-sw.js with scope "/admin/".
 *
 * WHY THIS EXISTS:
 * The customer SW (/sw.js) is registered from /src/app/layout.tsx with the
 * default scope "/". It does NOT register on /admin/ pages because the
 * customer layout wraps everything EXCEPT the /admin/ route (Next.js routes
 * /admin/* through /src/app/admin/layout.tsx instead).
 *
 * Without an admin-specific SW:
 *   - Chrome did not recognize /admin/ as installable (no SW with fetch
 *     handler covering the manifest's scope "/admin").
 *   - "Add to Home Screen" created a shortcut, not a standalone PWA.
 *
 * This component is included in /src/app/admin/layout.tsx and registers
 * /admin-sw.js with scope "/admin/", making the admin panel a distinct
 * standalone PWA separate from the customer-facing app.
 *
 * Mirrors the customer ServiceWorkerRegister pattern: production-only to
 * avoid stale-cache issues during development.
 */
export function AdminServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/admin-sw.js", { scope: "/admin/" })
        .catch(() => {});
    }
  }, []);
  return null;
}
