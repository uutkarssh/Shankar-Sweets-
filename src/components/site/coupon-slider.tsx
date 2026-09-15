"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Truck, Tag } from "lucide-react";
import { formatINR } from "@/lib/constants";
import { toast } from "sonner";

type Coupon = {
  code: string;
  description: string;
  discountType: "percent" | "flat" | "free_delivery";
  discountValue: number;
  minOrder: number;
  categorySlug?: string | null;
};

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
      <div className="flex items-center gap-1.5 px-1" style={{ marginBottom: "0.375rem" }}>
        <Tag style={{ width: 13, height: 13, color: "#D4A83E" }} />
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#641C27" }}>
          Offers
        </span>
      </div>

      {/* Horizontal scroller — uses ONLY Tailwind classes for overflow.
          No inline styles that could conflict with mobile browsers.
          The parent div on the homepage has overflow:hidden which
          prevents any horizontal leak from breaking the page layout. */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {coupons.map((c) => (
          <div
            key={c.code}
            className="flex shrink-0 items-center gap-2 rounded-xl border p-2"
            style={{
              borderColor: "#E8D9B8",
              background: "#FFFFFF",
              width: "260px",
              maxWidth: "75vw",
            }}
          >
            {/* Discount badge */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: c.discountType === "free_delivery" ? "#2F6B45" : "#641C27" }}
            >
              {c.discountType === "percent" && (
                <span className="text-[11px] font-extrabold" style={{ color: "#E5B84B" }}>{c.discountValue}%</span>
              )}
              {c.discountType === "free_delivery" && (
                <Truck style={{ width: 14, height: 14, color: "#E5B84B" }} />
              )}
              {c.discountType === "flat" && (
                <span className="text-[9px] font-extrabold" style={{ color: "#E5B84B" }}>{formatINR(c.discountValue)}</span>
              )}
            </div>
            {/* Details */}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[10px] font-semibold" style={{ color: "#3D1018" }}>
                {c.description}
              </p>
              <div className="mt-0.5 flex items-center gap-1">
                <span className="font-mono text-[9px] font-bold rounded px-1 py-0.5" style={{ background: "#F5E8CF", color: "#641C27" }}>
                  {c.code}
                </span>
                <button
                  onClick={() => copyCode(c.code)}
                  className="text-[8px] font-bold"
                  style={{ color: "#641C27" }}
                >
                  {copied === c.code ? "✓" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
