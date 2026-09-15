"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Copy, Check, Truck, Tag } from "lucide-react";
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

function discountBadge(c: Coupon): string {
  if (c.discountType === "percent") return `${c.discountValue}% OFF`;
  if (c.discountType === "free_delivery") return "FREE DELIVERY";
  return `${formatINR(c.discountValue)} OFF`;
}

function BadgeContent({ c }: { c: Coupon }) {
  if (c.discountType === "free_delivery") {
    return (
      <>
        <Truck style={{ width: 16, height: 16, color: "#E5B84B" }} />
        <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ color: "#FFF8E8" }}>Free Ship</span>
      </>
    );
  }
  if (c.discountType === "percent") {
    return (
      <>
        <span className="text-lg font-extrabold leading-none" style={{ color: "#E5B84B", fontFamily: "var(--font-poppins)" }}>{c.discountValue}%</span>
        <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ color: "#FFF8E8" }}>OFF</span>
      </>
    );
  }
  return (
    <>
      <span className="text-base font-extrabold leading-none" style={{ color: "#E5B84B", fontFamily: "var(--font-poppins)" }}>{formatINR(c.discountValue)}</span>
      <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ color: "#FFF8E8" }}>OFF</span>
    </>
  );
}

export function CouponSlider() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coupons", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list: Coupon[] = Array.isArray(d.coupons) ? d.coupons : [];
        // Only show coupons that have a meaningful discount (skip broken/zeros)
        setCoupons(list.filter((c) => c.discountValue > 0 || c.discountType === "free_delivery"));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copyCode = (code: string) => {
    try {
      navigator.clipboard?.writeText(code);
    } catch {}
    setCopied(code);
    toast.success(`Coupon ${code} copied!`, { description: "Paste it at checkout." });
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
  };

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(320, el.clientWidth * 0.8), behavior: "smooth" });
  };

  if (loading || coupons.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-3 pt-4 sm:px-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full" style={{ background: "#D4A83E" }} />
          <h2 className="text-base font-semibold sm:text-lg" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>
            Today&apos;s Offers
          </h2>
          <Tag style={{ width: 14, height: 14, color: "#76544A" }} />
        </div>
        <div className="hidden gap-1 sm:flex">
          <button
            onClick={() => scrollBy(-1)}
            className="grid h-7 w-7 place-items-center rounded-full border transition hover:scale-105"
            style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#641C27" }}
            aria-label="Scroll offers left"
          >
            <ChevronLeft style={{ width: 14, height: 14 }} />
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="grid h-7 w-7 place-items-center rounded-full border transition hover:scale-105"
            style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#641C27" }}
            aria-label="Scroll offers right"
          >
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar -mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
        style={{ scrollPaddingLeft: "0.5rem" }}
      >
        {coupons.map((c) => (
          <div
            key={c.code}
            className="snap-start shrink-0 overflow-hidden rounded-2xl border shadow-sm"
            style={{ borderColor: "#E8D9B8", background: "#FFFFFF", width: "min(80vw, 280px)" }}
          >
            <div className="flex items-stretch">
              {/* Discount badge column */}
              <div
                className="flex w-16 shrink-0 flex-col items-center justify-center p-2 text-center"
                style={{ background: c.discountType === "free_delivery" ? "#2F6B45" : "#641C27" }}
              >
                <BadgeContent c={c} />
              </div>
              {/* Details */}
              <div className="flex-1 p-2.5">
                <h3 className="line-clamp-2 text-[11px] font-semibold leading-snug" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
                  {c.description}
                </h3>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className="font-mono text-[10px] font-bold tracking-wider rounded px-1.5 py-0.5"
                    style={{ background: "#F5E8CF", color: "#641C27" }}
                  >
                    {c.code}
                  </span>
                  <button
                    onClick={() => copyCode(c.code)}
                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-bold transition hover:bg-[#F5E8CF]"
                    style={{ color: "#641C27" }}
                    aria-label={`Copy ${c.code}`}
                  >
                    {copied === c.code ? <Check style={{ width: 10, height: 10, color: "#2F6B45" }} /> : <Copy style={{ width: 10, height: 10 }} />}
                    {copied === c.code ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="mt-1 text-[9px]" style={{ color: "#76544A" }}>
                  Min order {formatINR(c.minOrder)}
                  {c.categorySlug ? ` · ${c.categorySlug} only` : ""}
                </div>
              </div>
            </div>
            {/* Bottom discount strip */}
            <div
              className="px-3 py-1 text-center text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "#F5E8CF", color: "#641C27" }}
            >
              {discountBadge(c)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
