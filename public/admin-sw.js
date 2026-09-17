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

const ADMIN_CACHE = "shankar-admin-v2";
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

// ─── Push notification handlers (admin) ────────────────────────────
// Fires when the backend sends a push via web-push (e.g. a new order came in).
// Same payload shape as the customer SW: { title, body, url?, data?, tag?, icon?, badge? }
// The default deep-link URL is /admin/orders (not /orders) since this is the admin SW.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Shankar Sweets Admin";
  const body = payload.body || "";
  const tag = payload.tag || "shankar-admin-default";
  const url = payload.url || "/admin/orders";
  const icon = payload.icon || "/images/brand/admin-icon-192.png";
  const badge = payload.badge || "/images/brand/favicon-48.png";
  const data = Object.assign({ url, date: Date.now() }, payload.data || {});

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon,
      badge,
      data,
      requireInteraction: true, // admin notifications stay until dismissed — order alerts shouldn't be missed
      renotify: true,
    })
  );
});

// ─── Notification click handler (admin) ────────────────────────────
// Tapping the notification opens the admin orders page (or the specific order
// deep-link from the payload). Focuses an existing admin window if one is open.

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const targetUrl = (notification.data && notification.data.url) || "/admin/orders";
  notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Look for an open admin window (URL contains /admin)
      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin) && client.url.includes("/admin")) {
          client.focus();
          if ("postMessage" in client) {
            client.postMessage({ type: "PUSH_NOTIFICATION_CLICK", url: targetUrl });
          }
          return;
        }
      }

      // No existing admin window — open a new one
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
