"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Share2, X } from "lucide-react";
import {
  subscribeForAdminPush,
  unsubscribe,
  isIOSSafari,
  browserSupportsPush,
  getNotificationPermission,
} from "@/lib/push-client";
import { toast } from "sonner";

/**
 * AdminPushToggle — admin-side push notification subscription toggle.
 *
 * Shows up as a button in the admin panel header. On click:
 *   - If not subscribed → requests permission + subscribes
 *   - If subscribed → unsubscribes (deletes from DB + browser)
 *
 * On iOS, shows an "Add to Home Screen" hint instead of the toggle, because
 * iOS Safari silently fails on push without home-screen install.
 *
 * Persists the subscribed state in localStorage so the button reflects
 * reality across page loads (we don't fetch the backend subscription list
 * to determine state — that'd be too heavy for the header).
 */

const LS_KEY = "shankar-admin-push-endpoint";

export function AdminPushToggle() {
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!browserSupportsPush()) {
      setSupported(false);
      if (isIOSSafari()) setShowIosHint(true);
      return;
    }
    try {
      setEndpoint(localStorage.getItem(LS_KEY));
    } catch {
      // localStorage unavailable
    }
  }, []);

  async function handleEnable() {
    setBusy(true);
    const result = await subscribeForAdminPush();
    setBusy(false);
    if (result.ok && result.subscribed) {
      // Store the endpoint so we can unsubscribe later. We re-fetch it from
      // the live SW registration since the subscribe helper doesn't return it.
      try {
        const reg = await navigator.serviceWorker.getRegistration("/admin/");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
          localStorage.setItem(LS_KEY, sub.endpoint);
          setEndpoint(sub.endpoint);
        }
      } catch {
        // best-effort
      }
      toast.success("Admin notifications enabled", {
        description: "You'll get a push for every new order.",
      });
    } else {
      toast.error("Couldn't enable notifications", {
        description: result.error,
      });
    }
  }

  async function handleDisable() {
    if (!endpoint) return;
    setBusy(true);
    const ok = await unsubscribe(endpoint, true);
    setBusy(false);
    if (ok) {
      try { localStorage.removeItem(LS_KEY); } catch {}
      setEndpoint(null);
      toast.success("Admin notifications disabled");
    } else {
      toast.error("Couldn't disable notifications");
    }
  }

  // ── iOS hint (PWA must be added to home screen first) ──
  if (showIosHint) {
    return (
      <button
        onClick={() => setShowIosHint(false)}
        className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
        aria-label="Push requires Add to Home Screen on iOS"
        title="Push requires Add to Home Screen on iOS"
      >
        <Share2 style={{ width: 16, height: 16, color: "#E5B84B" }} />
      </button>
    );
  }

  if (!supported) return null;

  // ── Subscribed state → show "Disable" button ──
  if (endpoint) {
    return (
      <button
        onClick={handleDisable}
        disabled={busy}
        className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-50"
        aria-label="Disable order notifications"
        title="Order notifications enabled — click to disable"
      >
        <Bell style={{ width: 16, height: 16, color: "#E5B84B" }} />
      </button>
    );
  }

  // ── Default state → show "Enable" button ──
  // If permission was previously denied, the click will fail gracefully
  // (the helper returns an error result with a descriptive message).
  const denied = getNotificationPermission() === "denied";

  return (
    <button
      onClick={handleEnable}
      disabled={busy}
      className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-50"
      aria-label="Enable order notifications"
      title={denied ? "Notifications blocked in browser settings" : "Enable order notifications"}
    >
      <BellOff style={{ width: 16, height: 16, color: denied ? "#76544A" : "#FFF8E8" }} />
    </button>
  );
}
