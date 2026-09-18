"use client";

import { useEffect, useRef, useState } from "react";
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
export function PostOrderPushSubscribe({
  orderId,
  customerPhone,
}: {
  orderId?: string;
  customerPhone?: string;
}) {
  const [state, setState] = useState<"idle" | "subscribing" | "subscribed" | "failed" | "unsupported" | "ios">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  // Keep latest orderId/customerPhone in refs so doSubscribe (called from
  // the "Enable" button onClick) always reads the freshest values, even
  // if the parent re-renders after the user clicks the button.
  const orderIdRef = useRef(orderId);
  const phoneRef = useRef(customerPhone);
  useEffect(() => {
    orderIdRef.current = orderId;
  }, [orderId]);
  useEffect(() => {
    phoneRef.current = customerPhone;
  }, [customerPhone]);

  useEffect(() => {
    // Don't render anything if we have NEITHER orderId NOR customerPhone.
    // (The backend requires at least one — without it, subscribe would fail
    // with "Missing 'orderId' or 'customerPhone'". Render nothing instead
    // of showing a broken Enable button that just errors on click.)
    if (!orderId && !customerPhone) return;

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
  }, [orderId, customerPhone]);

  async function doSubscribe() {
    // Read the latest orderId/customerPhone from refs (parent might have
    // updated them between when the button rendered and when the user clicked).
    const oid = orderIdRef.current;
    const phone = phoneRef.current;

    // Defensive: don't even try if we have neither identity value. This
    // prevents the "Backend rejected subscription: Missing 'orderId' or
    // 'customerPhone'" error from ever firing.
    if (!oid && !phone) {
      setState("failed");
      setErrorMsg("Cannot subscribe — missing order info. Try refreshing the page.");
      return;
    }

    setState("subscribing");
    setErrorMsg("");
    const result = await subscribeForOrderPush({ orderId: oid, customerPhone: phone });
    if (result.ok && result.subscribed) {
      setState("subscribed");
    } else {
      setState("failed");
      setErrorMsg(result.error || "Failed to enable notifications");
    }
  }

  // ── Render: nothing if the browser doesn't support push at all,
  //    OR if we have neither orderId nor customerPhone (can't associate
  //    the subscription with anyone — showing an Enable button would
  //    just trigger a "Missing 'orderId' or 'customerPhone'" error). ──
  if (state === "unsupported" || dismissed) return null;
  if (!orderId && !customerPhone) return null;

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
  // This card is now rendered at the TOP of the checkout confirmation screen
  // (above the order details card). Made prominent — gradient burgundy bg,
  // larger bell icon, bigger Enable button — so users actually notice it
  // without scrolling. Looks like a system notification banner.
  return (
    <div
      className="mt-4 overflow-hidden rounded-2xl border shadow-md"
      style={{ borderColor: "#D4A83E", background: "linear-gradient(135deg, #641C27 0%, #3D1018 100%)" }}
    >
      <div className="flex items-center gap-3 p-4">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
          style={{ background: "#E5B84B" }}
        >
          <Bell style={{ width: 20, height: 20, color: "#641C27" }} />
        </div>
        <div className="min-w-0 flex-1 text-white">
          {state === "idle" && (
            <>
              <div
                className="text-sm font-bold"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                🔔 Get order updates on your phone
              </div>
              <div className="mt-0.5 text-[11px]" style={{ color: "rgba(255,248,232,0.85)" }}>
                Know the moment your order is accepted, preparing, or out for delivery.
              </div>
            </>
          )}
          {state === "subscribing" && (
            <div className="text-xs" style={{ color: "rgba(255,248,232,0.85)" }}>
              Enabling notifications…
            </div>
          )}
          {state === "subscribed" && (
            <>
              <div
                className="text-sm font-bold"
                style={{ color: "#E5B84B", fontFamily: "var(--font-poppins)" }}
              >
                ✓ Order updates enabled
              </div>
              <div className="mt-0.5 text-[11px]" style={{ color: "rgba(255,248,232,0.8)" }}>
                We&apos;ll ping you when your order status changes.
              </div>
            </>
          )}
          {state === "failed" && (
            <>
              <div
                className="text-sm font-bold"
                style={{ color: "#FECACA", fontFamily: "var(--font-poppins)" }}
              >
                Notifications unavailable
              </div>
              <div className="mt-0.5 text-[11px]" style={{ color: "rgba(255,248,232,0.8)" }}>
                {errorMsg}
              </div>
            </>
          )}
        </div>
        {state === "idle" && (
          <button
            onClick={doSubscribe}
            className="shrink-0 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wide transition hover:scale-105"
            style={{ background: "#E5B84B", color: "#3D1018" }}
          >
            Allow
          </button>
        )}
        {state === "failed" && (
          <button
            onClick={() => setDismissed(true)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10"
            aria-label="Dismiss"
          >
            <X style={{ width: 12, height: 12, color: "#FFF8E8" }} />
          </button>
        )}
      </div>
    </div>
  );
}
