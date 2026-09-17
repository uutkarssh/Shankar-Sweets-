"use client";

import { useEffect, useState } from "react";
import { Bell, X, Share2 } from "lucide-react";
import {
  subscribeForOrderPush,
  isIOSSafari,
  browserSupportsPush,
  getNotificationPermission,
} from "@/lib/push-client";

/**
 * PostOrderPushSubscribe — customer-side component that, after an order is
 * placed, requests notification permission + subscribes for push so the
 * customer gets status-update notifications ("out for delivery" etc).
 *
 * Designed to be mounted inside the order confirmation screen — NOT on
 * page load — so we don't burn permission-prompt fatigue on customers
 * who haven't actually placed an order.
 *
 * UX:
 *   1. If browser doesn't support push → show nothing (silent).
 *   2. If iOS Safari → show "Add to Home Screen" hint instead of asking
 *      permission (push silently fails on iOS without home-screen install).
 *   3. Otherwise → automatically request permission + subscribe on mount.
 *      On success → show a small confirmation toast/pill.
 *      On failure → show a small dismissible message with retry option.
 *
 * This component is non-blocking — push failing does NOT affect the order.
 */
export function PostOrderPushSubscribe({ orderId }: { orderId: string }) {
  const [state, setState] = useState<"idle" | "subscribing" | "subscribed" | "failed" | "unsupported" | "ios">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    // Pre-flight checks — don't ask permission if push isn't supported.
    if (!browserSupportsPush()) {
      if (isIOSSafari()) {
        setState("ios");
      } else {
        setState("unsupported");
      }
      return;
    }

    // If permission was previously denied, don't bother re-asking (the
    // browser won't show the prompt again — it'd just fail silently).
    if (getNotificationPermission() === "denied") {
      setState("failed");
      setErrorMsg("Notifications are blocked in your browser settings.");
      return;
    }

    // Already granted? Subscribe right away. Otherwise wait for the user
    // to tap the "Enable" button (asking on mount would be too aggressive
    // given the customer just placed an order and saw a confirm toast).
    if (getNotificationPermission() === "granted") {
      void doSubscribe();
    } else {
      // Default state — show the "Enable order updates" button.
      setState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function doSubscribe() {
    setState("subscribing");
    setErrorMsg("");
    const result = await subscribeForOrderPush(orderId);
    if (result.ok && result.subscribed) {
      setState("subscribed");
    } else {
      setState("failed");
      setErrorMsg(result.error || "Failed to enable notifications");
    }
  }

  // ── Render: nothing if the browser doesn't support push at all ──
  if (state === "unsupported" || dismissed) return null;

  // ── iOS hint — iOS Safari silently fails on push unless the PWA is
  // installed on the home screen. Show a friendly instruction instead. ──
  if (state === "ios") {
    return (
      <div
        className="mt-4 rounded-2xl border p-3"
        style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}
      >
        <div className="flex items-start gap-3">
          <Share2 style={{ width: 18, height: 18, color: "#641C27", marginTop: 2 }} />
          <div className="flex-1 text-xs leading-relaxed" style={{ color: "#3D1018" }}>
            <strong style={{ fontFamily: "var(--font-poppins)" }}>Get order updates on iPhone?</strong>
            <p className="mt-1" style={{ color: "#76544A" }}>
              On iOS, push notifications only work after you add Shankar Sweets to your home screen.
              Tap the <strong>Share</strong> button in Safari, then <strong>Add to Home Screen</strong>.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-black/5"
            aria-label="Dismiss"
          >
            <X style={{ width: 12, height: 12, color: "#76544A" }} />
          </button>
        </div>
      </div>
    );
  }

  // ── Default / subscribing / subscribed / failed ──
  return (
    <div
      className="mt-4 rounded-2xl border p-3"
      style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "#641C27" }}>
          <Bell style={{ width: 16, height: 16, color: "#E5B84B" }} />
        </div>
        <div className="min-w-0 flex-1">
          {state === "idle" && (
            <>
              <div className="text-xs font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
                Get order updates
              </div>
              <div className="text-[11px]" style={{ color: "#76544A" }}>
                Know the moment your order is out for delivery.
              </div>
            </>
          )}
          {state === "subscribing" && (
            <div className="text-xs" style={{ color: "#76544A" }}>Enabling notifications…</div>
          )}
          {state === "subscribed" && (
            <>
              <div className="text-xs font-bold" style={{ color: "#2F6B45", fontFamily: "var(--font-poppins)" }}>
                ✓ Order updates enabled
              </div>
              <div className="text-[11px]" style={{ color: "#76544A" }}>
                We&apos;ll ping you when your order status changes.
              </div>
            </>
          )}
          {state === "failed" && (
            <>
              <div className="text-xs font-bold" style={{ color: "#B91C1C", fontFamily: "var(--font-poppins)" }}>
                Notifications unavailable
              </div>
              <div className="text-[11px]" style={{ color: "#76544A" }}>{errorMsg}</div>
            </>
          )}
        </div>
        {state === "idle" && (
          <button
            onClick={doSubscribe}
            className="shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide"
            style={{ background: "#641C27", color: "#FFF8E8" }}
          >
            Enable
          </button>
        )}
        {state === "failed" && (
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 grid h-6 w-6 place-items-center rounded-full bg-black/5"
            aria-label="Dismiss"
          >
            <X style={{ width: 12, height: 12, color: "#76544A" }} />
          </button>
        )}
      </div>
    </div>
  );
}
