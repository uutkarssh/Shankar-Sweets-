// Shankar Sweets & Bakery service worker — offline-safe shell + push notifications
const CACHE = "shankar-v4";
const ASSETS = ["/", "/menu", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Network-first for navigations, fallback to cache (no offline error page)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }
  // Cache-first for static assets
  if (url.pathname.startsWith("/images/") || url.pathname.startsWith("/_next/static/")) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req)));
    return;
  }
});

// ─── Push notification handlers (customer) ─────────────────────────
// Fires when the backend sends a push via web-push (e.g. order status changed).
// `event.data` is the JSON payload sent by /lib/push-server.ts:
//   { title, body, url?, data?, tag?, icon?, badge? }

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // If the payload isn't JSON, treat it as a plain-text body
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Shankar Sweets";
  const body = payload.body || "";
  const tag = payload.tag || "shankar-default";
  const url = payload.url || "/orders";
  const icon = payload.icon || "/images/brand/icon-192.png";
  const badge = payload.badge || "/images/brand/favicon-48.png";
  const data = Object.assign({ url, date: Date.now() }, payload.data || {});

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon,
      badge,
      data,
      requireInteraction: false, // auto-dismiss after a few seconds on most platforms
      renotify: true, // if tag matches, vibrate again to alert the user
    })
  );
});

// ─── Notification click handler ─────────────────────────────────────
// Tapping the notification opens/focuses the right URL in the PWA.
// Strategy:
//   1. Find an existing open customer-app window
//   2. If found, focus it and post a message so the React app can navigate
//   3. If not found, open a new window to the URL from the notification payload

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const targetUrl = (notification.data && notification.data.url) || "/orders";
  notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Look for a client whose URL starts with our origin (i.e. the PWA itself)
      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin)) {
          // Focus + navigate to the deep-link URL via postMessage
          client.focus();
          if ("postMessage" in client) {
            client.postMessage({ type: "PUSH_NOTIFICATION_CLICK", url: targetUrl });
          }
          return;
        }
      }

      // No existing window — open a new one
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

