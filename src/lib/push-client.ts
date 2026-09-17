"use client";

/**
 * Browser-side push subscription helper.
 *
 * Exposes:
 *   - getVapidPublicKey()       → returns NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   - subscribeForOrderPush(orderId) → customer path (after order placement)
 *   - subscribeForAdminPush()   → admin path (from admin panel toggle)
 *   - unsubscribe()             → removes the device's current subscription
 *
 * Both subscribe helpers:
 *   1. Check Notification.permission — return early if already denied
 *   2. Register a push subscription via serviceWorker.pushManager.subscribe()
 *   3. POST the subscription to the appropriate endpoint
 *
 * Service worker used:
 *   - Customer: /sw.js (scope "/")
 *   - Admin: /admin-sw.js (scope "/admin/")
 *
 * VAPID_PUBLIC_KEY is exposed to the browser via NEXT_PUBLIC_VAPID_PUBLIC_KEY
 * (the "NEXT_PUBLIC_" prefix is required for Next.js to inline it client-side).
 *
 * iOS note: Push only works on iOS 16.4+ AND only after the PWA is added to
 * the home screen. On iOS Safari, navigator.serviceWorker may exist but
 * pushManager.subscribe() will throw if the app isn't installed. Callers
 * should detect iOS and show the "Add to Home Screen" hint instead.
 */

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  // Fallback: hardcoded value so this works even if the env var isn't set
  // in the build environment (matches VAPID_PUBLIC_KEY in .env.local).
  "BCnG3iFGVGzChXBOyuBr8aQxGtKsomBzniKomMMP_wXOXPsB9b3HFMGOuNfxnYIl23bTJjaNuo_rj-4lfGJ7_T0";

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

/**
 * Detect iOS Safari (which requires "Add to Home Screen" for push to work).
 * Returns true on iOS Safari, even if iOS version is >= 16.4.
 */
export function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

/**
 * Detect if the browser supports push notifications at all.
 * Returns false on:
 *   - iOS Safari before PWA is installed (no PushManager support)
 *   - Desktop browsers with notifications disabled at the OS level
 */
export function browserSupportsPush(): boolean {
  if (typeof navigator === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  return true;
}

/**
 * Convert a base64url VAPID public key to Uint8Array (required by pushManager.subscribe).
 * The web-push library and most VAPID generators output base64url.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export type SubscribeResult =
  | { ok: true; subscribed: boolean; reason?: string }
  | { ok: false; error: string; iosHint?: boolean };

/**
 * Customer path: subscribe to push for a specific order.
 * Called after order placement — NOT on page load (to avoid permission-prompt fatigue).
 *
 * Posts to /api/push/subscribe with the orderId.
 */
export async function subscribeForOrderPush(orderId: string): Promise<SubscribeResult> {
  if (!browserSupportsPush()) {
    return {
      ok: false,
      error: "This browser does not support push notifications.",
      iosHint: isIOSSafari(),
    };
  }

  // Request permission first. On iOS this will only succeed if the PWA
  // is installed on the home screen; otherwise it throws.
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch (e) {
    return {
      ok: false,
      error: "Could not request notification permission. Try adding the app to your home screen first.",
      iosHint: isIOSSafari(),
    };
  }

  if (permission === "denied") {
    return { ok: false, error: "Notification permission was denied. You can change this in your browser settings." };
  }
  if (permission !== "granted") {
    return { ok: false, error: "Notification permission not granted." };
  }

  // Register/get the customer SW (/sw.js, scope "/").
  // The SW must already be registered for pushManager.subscribe to work —
  // we register it here if not (defensive; the customer SW registration
  // component is production-only, but we want this to work in dev too).
  let reg: ServiceWorkerRegistration;
  try {
    reg =
      await navigator.serviceWorker.getRegistration("/") ||
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
  } catch (e: any) {
    return { ok: false, error: `Service worker registration failed: ${e?.message || e}` };
  }

  // Subscribe via pushManager. The applicationServerKey is the VAPID public key.
  let subscription: PushSubscription;
  try {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true, // required — means we'll always show a notification
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  } catch (e: any) {
    return {
      ok: false,
      error: `Push subscription failed: ${e?.message || e}`,
      iosHint: isIOSSafari(),
    };
  }

  // POST the subscription to the backend
  const subJson = subscription.toJSON();
  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        orderId,
        userAgent: navigator.userAgent,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: `Backend rejected subscription: ${err.error || res.statusText}` };
    }
    return { ok: true, subscribed: true };
  } catch (e: any) {
    return { ok: false, error: `Failed to send subscription to server: ${e?.message || e}` };
  }
}

/**
 * Admin path: subscribe to push for ALL future new orders.
 * Called from the admin panel's "Enable Order Notifications" toggle.
 *
 * Posts to /api/admin/push/subscribe (behind admin auth cookie).
 */
export async function subscribeForAdminPush(): Promise<SubscribeResult> {
  if (!browserSupportsPush()) {
    return {
      ok: false,
      error: "This browser does not support push notifications.",
      iosHint: isIOSSafari(),
    };
  }

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch (e) {
    return {
      ok: false,
      error: "Could not request notification permission. Try adding the admin app to your home screen first.",
      iosHint: isIOSSafari(),
    };
  }

  if (permission === "denied") {
    return { ok: false, error: "Notification permission was denied. You can change this in your browser settings." };
  }
  if (permission !== "granted") {
    return { ok: false, error: "Notification permission not granted." };
  }

  // Register/get the admin SW (/admin-sw.js, scope "/admin/").
  let reg: ServiceWorkerRegistration;
  try {
    reg =
      await navigator.serviceWorker.getRegistration("/admin/") ||
      await navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin/" });
    await navigator.serviceWorker.ready;
  } catch (e: any) {
    return { ok: false, error: `Admin service worker registration failed: ${e?.message || e}` };
  }

  let subscription: PushSubscription;
  try {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  } catch (e: any) {
    return {
      ok: false,
      error: `Push subscription failed: ${e?.message || e}`,
      iosHint: isIOSSafari(),
    };
  }

  const subJson = subscription.toJSON();
  try {
    const res = await fetch("/api/admin/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        userAgent: navigator.userAgent,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: `Backend rejected subscription: ${err.error || res.statusText}` };
    }
    return { ok: true, subscribed: true };
  } catch (e: any) {
    return { ok: false, error: `Failed to send subscription to server: ${e?.message || e}` };
  }
}

/**
 * Unsubscribe the current device — removes the subscription from the browser
 * AND from the backend. Used by the admin "Disable notifications" toggle.
 */
export async function unsubscribe(endpoint: string, isAdmin: boolean): Promise<boolean> {
  try {
    // Tell the backend to remove it
    const url = isAdmin
      ? `/api/admin/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`
      : `/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`;
    await fetch(url, { method: "DELETE", credentials: "include" });

    // Also unregister the push subscription from the browser (so the device
    // doesn't keep receiving pushes that the backend won't track anymore).
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const sub = await reg.pushManager.getSubscription();
      if (sub && sub.endpoint === endpoint) {
        await sub.unsubscribe();
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the current Notification.permission state.
 * "default" = not asked yet, "granted" = OK, "denied" = blocked.
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}
