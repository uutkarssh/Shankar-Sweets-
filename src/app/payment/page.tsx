"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BUSINESS, formatINR } from "@/lib/constants";
import { ChevronLeft, CreditCard, Upload, Clock, CheckCircle2, AlertTriangle, XCircle, Loader2, Smartphone, Share2, Camera, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function PaymentPageWrapper() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center" style={{ background: "#FFF8E8" }}><div className="w-full max-w-md space-y-4 px-4"><div className="skeleton h-48 rounded-2xl skeleton-delay-1" /><div className="skeleton h-32 rounded-2xl skeleton-delay-2" /><div className="skeleton h-12 rounded-full skeleton-delay-3" /></div></div>}>
      <PaymentPage />
    </Suspense>
  );
}

function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";
  const orderId = searchParams.get("id") || "";
  const amount = Number(searchParams.get("amount") || "0");

  const [phase, setPhase] = useState<"loading" | "awaiting" | "verifying" | "expired">("loading");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [uploading, setUploading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [deepLink, setDeepLink] = useState<string>("");
  const [payeeId, setPayeeId] = useState<string>(BUSINESS.upiId || "");
  const [payeeName, setPayeeName] = useState<string>(BUSINESS.name);
  const upiAppOpenedRef = useRef(false);

  // Fetch QR code on mount
  useEffect(() => {
    if (!orderId) {
      setPhase("awaiting");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/orders/upi-qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setQrDataUrl(data.qrDataUrl);
          setDeepLink(data.deepLink);
          setPayeeId(data.payeeId);
          setPayeeName(data.payeeName);
          setPhase("awaiting");
          // Auto-open UPI app on mobile (will fail silently on desktop)
          // Use a small delay so the page renders first (prevents cart-empty flash)
          if (!upiAppOpenedRef.current && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
            upiAppOpenedRef.current = true;
            setTimeout(() => {
              try {
                window.location.href = data.deepLink;
              } catch {
                // Silent fail on desktop
              }
            }, 1500);
          }
        } else {
          // If order already paid, redirect to confirmation
          if (/already paid/i.test(data.error || "")) {
            router.push(`/checkout?confirmed=${orderNumber}&status=PAID`);
            return;
          }
          toast.error(data.error || "Failed to generate QR");
          setPhase("awaiting");
        }
      } catch {
        if (!cancelled) setPhase("awaiting");
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, orderNumber, router]);

  // Countdown timer
  useEffect(() => {
    if (phase !== "awaiting") return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPhase("expired");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const handleUpload = async (file: File) => {
    setUploading(true);
    setPhase("verifying");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch("/api/orders/payment-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, screenshot: base64 }),
        });
        const data = await res.json();
        if (data.verified) {
          toast.success("Payment verified!");
          router.push(`/checkout?confirmed=${orderNumber}&status=PAID`);
        } else {
          toast.warning("Payment under review", { description: data.reason || "Manual review needed" });
          router.push(`/checkout?confirmed=${orderNumber}&status=PENDING_VERIFICATION`);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Upload failed");
      setPhase("awaiting");
    } finally {
      setUploading(false);
    }
  };

  const continueWithoutScreenshot = async () => {
    setPhase("verifying");
    try {
      const res = await fetch("/api/orders/payment-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, manual: true }),
      });
      const data = await res.json();
      toast.info("Order placed — payment pending verification");
      router.push(`/checkout?confirmed=${orderNumber}&status=PENDING_VERIFICATION`);
    } catch {
      toast.error("Failed");
      setPhase("awaiting");
    }
  };

  const openUpiApp = () => {
    if (deepLink) {
      window.location.href = deepLink;
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 md:pb-8 text-center">
          <Loader2 className="animate-spin" style={{ width: 40, height: 40, color: "#D4A83E" }} />
          <p className="mt-3 text-sm font-semibold" style={{ color: "#641C27" }}>Preparing your payment...</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (phase === "expired") {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 md:pb-8 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full" style={{ background: "#FEE2E2" }}>
            <XCircle style={{ width: 40, height: 40, color: "#B91C1C" }} />
          </div>
          <h1 className="mt-4 text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Payment Window Expired</h1>
          <p className="mt-1 text-sm" style={{ color: "#76544A" }}>The 5-minute payment window has passed.</p>
          <button onClick={() => { setPhase("awaiting"); setTimeLeft(300); }} className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
            <RefreshCw style={{ width: 16, height: 16 }} /> Start New Payment Attempt
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-24 md:pb-8">
        <div className="mx-auto max-w-3xl px-3 pt-3 sm:px-4">
          <button onClick={() => router.push("/orders")} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "#641C27" }}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Cancel & View Orders
          </button>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>UPI Payment</h1>
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          {/* Order summary */}
          <div className="rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Order Number</div>
                <div className="text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{orderNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Amount to Pay</div>
                <div className="text-2xl font-extrabold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(amount)}</div>
              </div>
            </div>
          </div>

          {/* Countdown timer */}
          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold" style={{ background: timeLeft < 60 ? "#FEE2E2" : "#FEF3C7", color: timeLeft < 60 ? "#B91C1C" : "#92400E" }}>
            <Clock style={{ width: 16, height: 16 }} />
            {phase === "verifying" ? "Verifying payment..." : `Time remaining: ${timeStr}`}
          </div>

          {phase === "verifying" ? (
            <div className="mt-6 flex flex-col items-center py-8">
              <Loader2 className="animate-spin" style={{ width: 40, height: 40, color: "#D4A83E" }} />
              <p className="mt-3 text-sm font-semibold" style={{ color: "#641C27" }}>Verifying with AI...</p>
            </div>
          ) : (
            <>
              {/* QR Code section — prominently displayed */}
              <div className="mt-4 flex flex-col items-center rounded-2xl border p-4" style={{ borderColor: "#D4A83E", background: "#FFFFFF" }}>
                <div className="flex items-center gap-2">
                  <CreditCard style={{ width: 16, height: 16, color: "#D4A83E" }} />
                  <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Scan to Pay with any UPI app</h3>
                </div>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="UPI Payment QR Code"
                    className="mt-3 h-64 w-64 rounded-xl border"
                    style={{ borderColor: "#E8D9B8" }}
                  />
                ) : (
                  <div className="mt-3 grid h-64 w-64 place-items-center rounded-xl" style={{ background: "#F5E8CF" }}>
                    <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "#D4A83E" }} />
                  </div>
                )}
                <p className="mt-3 text-center text-xs" style={{ color: "#76544A" }}>
                  {payeeName} · {payeeId}
                </p>
                <p className="mt-1 text-center text-[11px]" style={{ color: "#76544A" }}>
                  Ref: {orderNumber}
                </p>
              </div>

              {/* UPI app button */}
              <button
                onClick={openUpiApp}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold uppercase tracking-wide transition hover:scale-[1.02]"
                style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
              >
                <Smartphone style={{ width: 16, height: 16, color: "#E5B84B" }} />
                Pay {formatINR(amount)} via UPI App
              </button>

              {/* Upload screenshot */}
              <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Payment Confirmation</h3>

                {/* GPay vs other apps guidance */}
                <div className="mt-2 space-y-2">
                  <div className="rounded-lg p-2 text-[11px] leading-relaxed" style={{ background: "#DBEAFE", color: "#1E40AF" }}>
                    <strong className="flex items-center gap-1"><Share2 style={{ width: 12, height: 12 }} /> Using Google Pay?</strong>
                    Screenshots are blocked (appear black). Tap the "Share" button on the payment success screen instead.
                  </div>
                  <div className="rounded-lg p-2 text-[11px] leading-relaxed" style={{ background: "#D1FAE5", color: "#065F46" }}>
                    <strong className="flex items-center gap-1"><Camera style={{ width: 12, height: 12 }} /> Using PhonePe, Paytm, BHIM?</strong>
                    A regular screenshot of the payment success screen works fine.
                  </div>
                </div>

                <p className="mt-3 text-xs" style={{ color: "#76544A" }}>
                  Upload the image within <strong>{timeStr}</strong>. We'll verify it automatically with AI.
                </p>

                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-semibold transition hover:bg-[#FFF8E8]" style={{ borderColor: "#D4A83E", color: "#641C27" }}>
                  <Upload style={{ width: 16, height: 16 }} />
                  {uploading ? "Uploading..." : "Upload Payment Screenshot"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                </label>
                <div className="my-3 flex items-center gap-2 text-[10px]" style={{ color: "#76544A" }}>
                  <div className="h-px flex-1" style={{ background: "#E8D9B8" }} /> OR <div className="h-px flex-1" style={{ background: "#E8D9B8" }} />
                </div>
                <button onClick={continueWithoutScreenshot} className="w-full rounded-xl py-2.5 text-sm font-bold uppercase tracking-wide" style={{ background: "#F5E8CF", color: "#641C27", border: "1px solid #D4A83E" }}>
                  I have paid — Continue without screenshot
                </button>
                <p className="mt-2 text-center text-[10px]" style={{ color: "#76544A" }}>Once you upload, we'll verify and take you to confirmation automatically.</p>
              </div>

              {/* Helper note */}
              <div className="mt-3 flex items-start gap-2 rounded-xl p-2.5" style={{ background: "#F5E8CF" }}>
                <Info style={{ width: 14, height: 14, marginTop: 2, color: "#641C27", flexShrink: 0 }} />
                <p className="text-[11px] leading-relaxed" style={{ color: "#76544A" }}>
                  Once you upload the image, we'll verify it and take you to your order confirmation automatically. If we can't verify it instantly, your order is still placed — our team will confirm manually.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
