"use client";

import { useState, useEffect } from "react";
import { X, Gift, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "@/components/site/use-config";

type Coupon = {
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrder: number;
};

const STORAGE_KEY = "shankar-festive-banner-dismissed";

export function FestiveBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const offersEnabled = useConfig();

  useEffect(() => {
    setMounted(true);
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      if (d) setDismissed(true);
    } catch {}

    // Fetch active coupons from DB (only if offers are enabled)
    if (offersEnabled) {
      fetch("/api/coupons", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.coupons && d.coupons.length > 0) {
            setCoupons(d.coupons);
          }
        })
        .catch(() => {});
    }
  }, [offersEnabled]);

  if (!mounted || dismissed || !offersEnabled || coupons.length === 0) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    setDismissed(true);
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
        <Sparkles className="absolute right-4 top-4 opacity-20" style={{ width: 60, height: 60, color: "#E5B84B" }} />
        <Sparkles className="absolute bottom-2 left-4 opacity-10" style={{ width: 40, height: 40, color: "#E5B84B" }} />

        <button onClick={dismiss} className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/10 transition hover:bg-white/20" aria-label="Dismiss banner">
          <X style={{ width: 14, height: 14, color: "#FFF8E8" }} />
        </button>

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <Gift style={{ width: 18, height: 18, color: "#E5B84B" }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "#E5B84B" }}>Special Offers</span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-white sm:text-xl" style={{ fontFamily: "var(--font-poppins)" }}>
            Save on Every Order
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: "rgba(255,248,232,0.8)" }}>
            Copy a coupon code and apply at checkout.
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {coupons.slice(0, 3).map((c) => {
              const discountText = c.discountType === "percent" ? `${c.discountValue}% OFF` : c.discountType === "free_delivery" ? "FREE DELIVERY" : `₹${c.discountValue} OFF`;
              return (
                <button
                  key={c.code}
                  onClick={() => copyCode(c.code)}
                  className="group relative overflow-hidden rounded-xl border-2 border-dashed p-3 text-left transition hover:scale-[1.02]"
                  style={{ borderColor: "rgba(229,184,75,0.5)", background: "rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: "#641C27", color: "#FFF8E8" }}>{discountText}</span>
                    {copied === c.code ? <Check style={{ width: 14, height: 14, color: "#2F6B45" }} /> : <Copy style={{ width: 14, height: 14, color: "rgba(255,248,232,0.6)" }} className="transition group-hover:text-[#E5B84B]" />}
                  </div>
                  <div className="mt-1.5 font-mono text-sm font-bold tracking-wider text-white">{c.code}</div>
                  <p className="mt-0.5 text-[10px]" style={{ color: "rgba(255,248,232,0.7)" }}>{c.description}</p>
                  <p className="mt-0.5 text-[9px] font-semibold" style={{ color: "#E5B84B" }}>Min order ₹{c.minOrder}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
