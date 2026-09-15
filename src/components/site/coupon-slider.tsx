"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Truck, Tag, Calendar } from "lucide-react";
import { formatINR } from "@/lib/constants";
import { toast } from "sonner";

type Coupon = {
  code: string;
  description: string;
  discountType: "percent" | "flat" | "free_delivery";
  discountValue: number;
  minOrder: number;
  categorySlug?: string | null;
  expiresAt?: string | null;
};

function getDiscountLabel(c: Coupon): string {
  if (c.discountType === "percent") return `Flat ${c.discountValue}% OFF`;
  if (c.discountType === "free_delivery") return "FREE DELIVERY";
  return `Flat ${formatINR(c.discountValue)} OFF`;
}

export function CouponSlider() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coupons", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list: Coupon[] = Array.isArray(d.coupons) ? d.coupons : [];
        setCoupons(list.filter((c) => c.discountValue > 0 || c.discountType === "free_delivery"));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const copyCode = (code: string) => {
    try { navigator.clipboard?.writeText(code); } catch {}
    setCopied(code);
    toast.success(`Coupon ${code} copied!`);
    setTimeout(() => setCopied(c => c === code ? null : c), 2000);
  };

  if (loading || coupons.length === 0) return null;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4" style={{ paddingTop: "0.5rem", paddingBottom: "0.25rem" }}>
      {/* Heading */}
      <div className="flex items-center gap-1.5 px-1" style={{ marginBottom: "0.5rem" }}>
        <Tag style={{ width: 15, height: 15, color: "#D4A83E" }} />
        <span className="text-sm font-bold uppercase tracking-wider" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
          Offers
        </span>
      </div>

      {/* Horizontal scroller */}
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {coupons.map((c) => {
          const hasExpiry = c.expiresAt && new Date(c.expiresAt) > new Date();
          const expiryDate = hasExpiry
            ? new Date(c.expiresAt!).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : null;

          return (
            <div
              key={c.code}
              className="shrink-0 overflow-hidden rounded-2xl border"
              style={{
                borderColor: "#E8D9B8",
                background: "#FFFFFF",
                width: "300px",
                maxWidth: "82vw",
              }}
            >
              {/* Top strip: discount badge */}
              <div
                className="flex items-center justify-between px-3 py-1.5"
                style={{ background: c.discountType === "free_delivery" ? "#2F6B45" : "#641C27" }}
              >
                <span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "#E5B84B" }}>
                  {getDiscountLabel(c)}
                </span>
                {c.discountType === "free_delivery" ? (
                  <Truck style={{ width: 14, height: 14, color: "#E5B84B" }} />
                ) : (
                  <Tag style={{ width: 14, height: 14, color: "#E5B84B" }} />
                )}
              </div>

              {/* Body: description + details */}
              <div className="p-3">
                <p className="text-[13px] font-semibold leading-snug" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
                  {c.description}
                </p>

                {/* Min order + expiry */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[11px]" style={{ color: "#76544A" }}>
                    Min order: <strong style={{ color: "#641C27" }}>{c.minOrder === 0 ? "₹0" : formatINR(c.minOrder)}</strong>
                  </span>
                  {expiryDate && (
                    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "#76544A" }}>
                      <Calendar style={{ width: 10, height: 10 }} />
                      Valid till {expiryDate}
                    </span>
                  )}
                </div>

                {/* Code + copy */}
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-mono text-xs font-bold tracking-wider rounded-lg px-2.5 py-1"
                      style={{ background: "#F5E8CF", color: "#641C27", border: "1px dashed #D4A83E" }}
                    >
                      {c.code}
                    </span>
                  </div>
                  <button
                    onClick={() => copyCode(c.code)}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold transition"
                    style={{
                      background: copied === c.code ? "#2F6B45" : "#641C27",
                      color: "#FFF8E8",
                    }}
                  >
                    {copied === c.code ? (
                      <><Check style={{ width: 11, height: 11 }} /> Copied</>
                    ) : (
                      <><Copy style={{ width: 11, height: 11 }} /> Copy</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
