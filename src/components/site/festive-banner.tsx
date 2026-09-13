"use client";

import { useState, useEffect } from "react";
import { X, Gift, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Coupon = {
  code: string;
  description: string;
  discount: string;
  minOrder: number;
  color: string;
};

const COUPONS: Coupon[] = [
  { code: "WELCOME10", description: "10% off on your first order", discount: "10% OFF", minOrder: 200, color: "#641C27" },
  { code: "SWEET15", description: "15% off on sweets & bakery", discount: "15% OFF", minOrder: 300, color: "#D4A83E" },
  { code: "FREESHIP", description: "Free delivery on any order", discount: "FREE DELIVERY", minOrder: 150, color: "#2F6B45" },
];

const STORAGE_KEY = "shankar-festive-banner-dismissed";

export function FestiveBanner() {
  const [mounted, setMounted] = useState(false);
  const [locallyDismissed, setLocallyDismissed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check localStorage only after mount to avoid hydration mismatch
  let storageDismissed = false;
  if (mounted) {
    try {
      storageDismissed = !!localStorage.getItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  if (!mounted || storageDismissed || locallyDismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setLocallyDismissed(true);
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    toast.success(`Coupon ${code} copied!`, { description: "Paste it at checkout." });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className="mx-auto mt-4 max-w-6xl px-3 sm:px-4">
      <div className="relative overflow-hidden rounded-3xl border p-5" style={{ borderColor: "#D4A83E", background: "linear-gradient(135deg, #641C27 0%, #3D1018 50%, #641C27 100%)" }}>
        {/* Decorative sparkles */}
        <Sparkles className="absolute right-4 top-4 opacity-20" style={{ width: 60, height: 60, color: "#E5B84B" }} />
        <Sparkles className="absolute bottom-2 left-4 opacity-10" style={{ width: 40, height: 40, color: "#E5B84B" }} />

        <button
          onClick={dismiss}
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
          aria-label="Dismiss banner"
        >
          <X style={{ width: 14, height: 14, color: "#FFF8E8" }} />
        </button>

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <Gift style={{ width: 18, height: 18, color: "#E5B84B" }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "#E5B84B" }}>Festive Offers</span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-white sm:text-xl" style={{ fontFamily: "var(--font-poppins)" }}>
            Save Big on Every Order
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: "rgba(255,248,232,0.8)" }}>
            Copy a coupon code and apply at checkout. Limited time only!
          </p>

          {/* Coupon cards */}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {COUPONS.map((c) => (
              <button
                key={c.code}
                onClick={() => copyCode(c.code)}
                className="group relative overflow-hidden rounded-xl border-2 border-dashed p-3 text-left transition hover:scale-[1.02]"
                style={{ borderColor: c.color === "#641C27" ? "#E5B84B" : "rgba(229,184,75,0.5)", background: "rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: c.color, color: "#FFF8E8" }}>
                    {c.discount}
                  </span>
                  {copied === c.code ? (
                    <Check style={{ width: 14, height: 14, color: "#2F6B45" }} />
                  ) : (
                    <Copy style={{ width: 14, height: 14, color: "rgba(255,248,232,0.6)" }} className="transition group-hover:text-[#E5B84B]" />
                  )}
                </div>
                <div className="mt-1.5 font-mono text-sm font-bold tracking-wider text-white">{c.code}</div>
                <p className="mt-0.5 text-[10px]" style={{ color: "rgba(255,248,232,0.7)" }}>{c.description}</p>
                <p className="mt-0.5 text-[9px] font-semibold" style={{ color: "#E5B84B" }}>Min order ₹{c.minOrder}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
