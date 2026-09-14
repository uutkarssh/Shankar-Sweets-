"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BUSINESS, formatINR } from "@/lib/constants";
import { ChevronLeft, CreditCard, Upload, Clock, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PaymentPageWrapper() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center" style={{ background: "#FFF8E8" }}><div className="shimmer h-8 w-8 rounded-full" /></div>}>
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

  const [phase, setPhase] = useState<"awaiting" | "verifying" | "expired">("awaiting");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [uploading, setUploading] = useState(false);

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
        // Send screenshot for verification
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

  if (phase === "expired") {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full" style={{ background: "#FEE2E2" }}>
            <XCircle style={{ width: 40, height: 40, color: "#B91C1C" }} />
          </div>
          <h1 className="mt-4 text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Payment Window Expired</h1>
          <p className="mt-1 text-sm" style={{ color: "#76544A" }}>The 5-minute payment window has passed.</p>
          <button onClick={() => setPhase("awaiting")} className="mt-5 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>Start New Payment Attempt</button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-24">
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
              {/* UPI payment details */}
              <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#D4A83E", background: "#FFFFFF" }}>
                <div className="flex items-center gap-2">
                  <CreditCard style={{ width: 16, height: 16, color: "#D4A83E" }} />
                  <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Pay via UPI</h3>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl p-3" style={{ background: "#FFF8E8" }}>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>UPI ID</div>
                    <div className="font-mono text-sm font-bold" style={{ color: "#641C27" }}>{BUSINESS.upiId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Payee</div>
                    <div className="text-sm font-semibold" style={{ color: "#3D1018" }}>{BUSINESS.name}</div>
                  </div>
                </div>
                <button
                  onClick={() => { window.location.href = `upi://pay?pa=${BUSINESS.upiId}&pn=${encodeURIComponent(BUSINESS.name)}&am=${amount}&cu=INR`; }}
                  className="mt-3 w-full rounded-xl py-3 text-sm font-bold uppercase tracking-wide transition hover:scale-[1.02]"
                  style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
                >
                  Pay {formatINR(amount)} via UPI App
                </button>
              </div>

              {/* Upload screenshot */}
              <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Payment Confirmation</h3>
                <div className="mt-2 rounded-lg p-2 text-[11px]" style={{ background: "#DBEAFE", color: "#1E40AF" }}>
                  Using Google Pay? Screenshots may appear black. Use the Share button instead.
                </div>
                <div className="mt-2 rounded-lg p-2 text-[11px]" style={{ background: "#D1FAE5", color: "#065F46" }}>
                  Using PhonePe, Paytm, BHIM? A regular screenshot works fine.
                </div>
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
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
