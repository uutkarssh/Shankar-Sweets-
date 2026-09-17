// Shankar Sweets Admin — dedicated service worker for the /admin/ scope.
//
// This SW is registered from /src/components/admin/admin-sw-register.tsx
// (included in /src/app/admin/layout.tsx) with scope: "/admin/".
//
// WHY THIS EXISTS:
// Previously, only the customer SW (/sw.js, scope "/") was registered, and
// only from the customer layout (/src/app/layout.tsx). The admin layout did
// not register any SW. Chrome's PWA installability criteria require a SW
// with a fetch handler covering the manifest's scope. Without an admin SW:
//   1. Chrome did not offer "Install app" for /admin/ — it fell back to
//      "Add to Home Screen" which creates a shortcut, not a standalone app.
//   2. Even when forced, the installed "app" was treated as a variant of
//      the customer PWA (same origin, no distinct SW scope) rather than a
//      separate app entry in the app switcher.
//
// This SW fixes both issues:
//   - It has a fetch handler → satisfies Chrome's installability criteria.
//   - It is scoped to /admin/ → the admin PWA is a distinct app from the
//     customer PWA (separate app window, separate app-list entry).
//
// Cache strategy:
//   - Network-first for navigations under /admin/ (always get fresh admin
//     pages; fall back to cache if offline).
//   - Cache-first for static assets (_next/static, images) — they're
//     fingerprinted so stale cache is safe.
//   - Bump ADMIN_CACHE version on any breaking change to force existing
//     admin PWA installs to pick up new assets.

const ADMIN_CACHE = "shankar-admin-v1";
const ADMIN_ASSETS = ["/admin", "/admin-manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(ADMIN_CACHE).then((c) => c.addAll(ADMIN_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== ADMIN_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin requests — let cross-origin (Supabase, etc.) pass through
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations (admin pages)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(ADMIN_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/admin")))
    );
    return;
  }

  // Cache-first for static assets (JS/CSS chunks, images, etc.)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname === "/admin-manifest.json"
  ) {
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((res) => {
        // Cache successful responses for next time
        if (res.ok) {
          const copy = res.clone();
          caches.open(ADMIN_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  // Let API requests and everything else pass through (no caching)
});
