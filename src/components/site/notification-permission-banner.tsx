"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import {
  browserSupportsPush,
  isIOSSafari,
  getNotificationPermission,
} from "@/lib/push-client";

/**
 * NotificationPermissionBanner — a prominent, dismissible banner that
 * shows at the TOP of every customer-facing page, prompting the user to
 * grant notification permission BEFORE they place an order.
 *
 * WHY THIS EXISTS:
 *   Previously, the only notification opt-in was on the checkout
 *   confirmation screen (PostOrderPushSubscribe), buried BELOW the order
 *   details card. Many users didn't scroll down to see it, so they never
 *   granted permission → never got push notifications about their order.
 *
 *   This banner appears immediately when the PWA is opened, so users can
 *   grant permission EARLY. When they later place an order, the
 *   PostOrderPushSubscribe component sees permission is already "granted"
 *   and auto-subscribes (no extra button click needed at checkout).
 *
 * UX FLOW:
 *   1. User opens PWA → banner shows at the top:
 *      "🔔 Get order updates on your phone — [Enable]"
 *   2. User clicks "Enable" → browser shows the native "Allow notifications?"
 *      dialog (this is the user-gesture the browser requires)
 *   3. If user clicks "Allow" → banner hides → permission is granted globally
 *   4. Later, when user places an order → PostOrderPushSubscribe auto-subscribes
 *
 * DISMISSAL:
 *   - User can click the X button → banner hides + localStorage flag set
 *   - Banner re-appears after 7 days (cooldown) if permission is still "default"
 *   - If permission is "granted" or "denied" → banner never shows
 *
 * ROUTE EXCLUSIONS:
 *   - /admin/* — admin has its own bell-icon toggle, not this banner
 *   - /checkout?confirmed=... — the confirmation screen has its own
 *     PostOrderPushSubscribe card (which is now at the TOP, more prominent)
 */

const DISMISS_KEY = "shankar-push-banner-dismissed";
const DISMISS_DAYS = 7;

export function NotificationPermissionBanner() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Don't show on admin routes — admin has its own toggle
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
      return;
    }

    // Don't show on the /install page — it's a standalone landing page
    if (typeof window !== "undefined" && window.location.pathname === "/install") {
      return;
    }

    // Don't show on the checkout confirmation screen — it has its own
    // PostOrderPushSubscribe card (now at the top, more prominent)
    const params = new URLSearchParams(window.location.search);
    if (params.get("confirmed")) {
      return;
    }

    // Don't show if push isn't supported
    if (!browserSupportsPush()) {
      // On iOS Safari, show the "Add to Home Screen" hint instead
      if (isIOSSafari()) {
        setIsIOS(true);
        setShow(true);
      }
      return;
    }

    // Only show if permission is "default" (not granted, not denied)
    if (getNotificationPermission() !== "default") return;

    // Check dismissal cooldown
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const days = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
        if (days < DISMISS_DAYS) return;
      }
    } catch {
      // localStorage unavailable — proceed
    }

    setShow(true);
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setShow(false);
        toast.success("Notifications enabled!", {
          description: "We'll ping you when your order status changes.",
        });
        // NOTE: We don't subscribe here because we don't have an
        // orderId/customerPhone yet. The actual push subscription happens
        // automatically when the user places an order (PostOrderPushSubscribe
        // sees permission is "granted" and auto-subscribes).
      } else if (permission === "denied") {
        setShow(false);
        toast.error("Notifications blocked", {
          description: "You can change this in your browser settings later.",
        });
      }
      // If permission is still "default" (user dismissed the native prompt
      // without choosing), keep the banner visible so they can try again.
    } catch {
      toast.error("Couldn't request permission", {
        description: "Try adding the app to your home screen first.",
      });
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // localStorage unavailable
    }
  }

  if (!show) return null;

  // ── iOS hint (push only works after home-screen install) ──
  if (isIOS) {
    return (
      <div
        className="sticky top-0 z-50 flex items-center gap-3 px-3 py-2.5 text-white shadow-md"
        style={{ background: "linear-gradient(90deg, #641C27 0%, #3D1018 100%)" }}
      >
        <Bell style={{ width: 18, height: 18, color: "#E5B84B", flexShrink: 0 }} />
        <div className="min-w-0 flex-1 text-xs leading-tight">
          <strong style={{ fontFamily: "var(--font-poppins)" }}>
            Get order updates on iPhone?
          </strong>
          <p className="mt-0.5" style={{ color: "rgba(255,248,232,0.8)" }}>
            Add Shankar Sweets to your Home Screen, then enable notifications.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10"
          aria-label="Dismiss"
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>
    );
  }

  // ── Standard banner (Android Chrome, desktop Chrome, etc.) ──
  return (
    <div
      className="sticky top-0 z-50 flex items-center gap-3 px-3 py-3 text-white shadow-md"
      style={{ background: "linear-gradient(90deg, #641C27 0%, #3D1018 100%)" }}
    >
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
        style={{ background: "#E5B84B" }}
      >
        <Bell style={{ width: 18, height: 18, color: "#641C27" }} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-sm font-bold"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          🔔 Get order updates on your phone
        </div>
        <div className="text-[11px]" style={{ color: "rgba(255,248,232,0.85)" }}>
          Know the moment your order is accepted, preparing, or out for delivery.
        </div>
      </div>
      <button
        onClick={handleEnable}
        disabled={busy}
        className="shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition hover:scale-105 disabled:opacity-50"
        style={{ background: "#E5B84B", color: "#3D1018" }}
      >
        {busy ? "…" : "Allow"}
      </button>
      <button
        onClick={handleDismiss}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10"
        aria-label="Dismiss"
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}
