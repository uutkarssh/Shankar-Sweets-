"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { BUSINESS, formatINR, COUPONS } from "@/lib/constants";
import { Truck, Clock, Phone, Tag, Copy, Check, Gift, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function OffersPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    toast.success(`Coupon ${code} copied!`, { description: "Paste it at checkout." });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-24 md:pb-8">
        <div className="mx-auto max-w-3xl px-3 pt-4 sm:px-4">
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>Offers & Coupons</h1>
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          {/* Hero offer banner */}
          <div className="mb-5 overflow-hidden rounded-3xl border p-5" style={{ borderColor: "#D4A83E", background: "linear-gradient(135deg, #641C27 0%, #3D1018 100%)" }}>
            <div className="flex items-center gap-2">
              <Gift style={{ width: 18, height: 18, color: "#E5B84B" }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "#E5B84B" }}>Exclusive Deals</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-white" style={{ fontFamily: "var(--font-poppins)" }}>
              Save on Every Order
            </h2>
            <p className="mt-1 text-xs" style={{ color: "rgba(255,248,232,0.8)" }}>
              Copy a coupon below and apply at checkout. Terms apply.
            </p>
          </div>

          {/* Coupon cards */}
          <div className="mb-5 space-y-3">
            {COUPONS.map((c) => (
              <div
                key={c.code}
                className="overflow-hidden rounded-2xl border"
                style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}
              >
                <div className="flex items-stretch">
                  {/* Left: discount badge */}
                  <div
                    className="flex w-20 shrink-0 flex-col items-center justify-center p-3 text-center"
                    style={{ background: c.discountType === "free_delivery" ? "#2F6B45" : "#641C27" }}
                  >
                    {c.discountType === "percent" ? (
                      <>
                        <span className="text-xl font-extrabold" style={{ color: "#E5B84B", fontFamily: "var(--font-poppins)" }}>{c.discountValue}%</span>
                        <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "#FFF8E8" }}>OFF</span>
                      </>
                    ) : c.discountType === "free_delivery" ? (
                      <>
                        <Truck style={{ width: 22, height: 22, color: "#E5B84B" }} />
                        <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ color: "#FFF8E8" }}>Free Ship</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-extrabold" style={{ color: "#E5B84B", fontFamily: "var(--font-poppins)" }}>{formatINR(c.discountValue)}</span>
                        <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "#FFF8E8" }}>OFF</span>
                      </>
                    )}
                  </div>
                  {/* Right: details */}
                  <div className="flex-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{c.description}</h3>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold tracking-wider rounded px-1.5 py-0.5" style={{ background: "#F5E8CF", color: "#641C27" }}>{c.code}</span>
                          <button
                            onClick={() => copyCode(c.code)}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold transition hover:bg-[#F5E8CF]"
                            style={{ color: "#641C27" }}
                            aria-label={`Copy ${c.code}`}
                          >
                            {copied === c.code ? <Check style={{ width: 10, height: 10, color: "#2F6B45" }} /> : <Copy style={{ width: 10, height: 10 }} />}
                            {copied === c.code ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1.5 text-[10px]" style={{ color: "#76544A" }}>
                      Min order {formatINR(c.minOrder)}
                      {c.categorySlug && ` · ${c.categorySlug} items only`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info offers */}
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
            <Sparkles style={{ width: 14, height: 14, color: "#E5B84B" }} /> More Benefits
          </h2>
          <div className="space-y-3">
            <OfferCard
              icon={Truck}
              title="Free Delivery above ₹300"
              desc={`Orders within 2 km and above ${formatINR(BUSINESS.freeDeliveryThreshold)} get free delivery — no coupon needed.`}
              accent
            />
            <OfferCard
              icon={Tag}
              title="Distance-based delivery fee"
              desc={`2-7 km: fee scales from ₹50 to ₹70 based on distance. Min order ₹700 (2-5 km) or ₹999 (5-7 km).`}
            />
            <OfferCard
              icon={Clock}
              title="Open Daily"
              desc={`Service hours: ${BUSINESS.openingTime} to ${BUSINESS.closingTime}, every day.`}
            />
            <OfferCard
              icon={Phone}
              title="Call to Order"
              desc={`Prefer to call? Reach us at ${BUSINESS.phones.join(" or ")}.`}
            />
          </div>

          {/* Loyalty note */}
          <div className="mt-5 rounded-2xl p-5 text-center" style={{ background: "#641C27", color: "#FFF8E8" }}>
            <div className="gold-divider mb-3 mx-auto max-w-xs"><svg width="24" height="10" viewBox="0 0 24 10" fill="none" aria-hidden><path d="M12 0 L15 5 L12 10 L9 5 Z" fill="#D4A83E" /></svg></div>
            <h3 className="text-base font-bold" style={{ fontFamily: "var(--font-poppins)" }}>{BUSINESS.tagline}</h3>
            <p className="mt-1 text-xs italic" style={{ color: "#E5B84B" }}>Serving Baraut since {BUSINESS.sinceYear}</p>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function OfferCard({ icon: Icon, title, desc, accent }: { icon: React.ElementType; title: string; desc: string; accent?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border p-4" style={{ borderColor: accent ? "#D4A83E" : "#E8D9B8", background: "#FFFFFF", boxShadow: accent ? "0 4px 18px -8px rgba(212,168,62,0.4)" : "none" }}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: accent ? "#641C27" : "#F5E8CF" }}>
        <Icon style={{ width: 18, height: 18, color: accent ? "#E5B84B" : "#641C27" }} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "#76544A" }}>{desc}</p>
      </div>
    </div>
  );
}
