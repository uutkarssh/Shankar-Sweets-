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
    <section className="mx-auto max-w-6xl px-3 sm:px-4" style={{ paddingTop: "0.75rem" }}>
      {/* Compact heading row */}
      <div className="flex items-center justify-between gap-2 px-1" style={{ marginBottom: "0.5rem" }}>
        <div className="flex items-center gap-1.5">
          <Tag style={{ width: 14, height: 14, color: "#D4A83E" }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
            Offers
          </span>
        </div>
        <div className="hidden gap-1 sm:flex">
          <button
            onClick={() => scrollBy(-1)}
            className="grid h-6 w-6 place-items-center rounded-full border"
            style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#641C27" }}
            aria-label="Scroll left"
          >
            <ChevronLeft style={{ width: 12, height: 12 }} />
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="grid h-6 w-6 place-items-center rounded-full border"
            style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#641C27" }}
            aria-label="Scroll right"
          >
            <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      {/*
        Scroller: compact horizontal slider.
        - NO touchAction restriction (allows vertical page scroll to work)
        - NO onTouchMove stopPropagation (was blocking page scroll on mobile)
        - overscrollBehaviorX: contain prevents scroll chaining (slider
          reaching its end doesn't start scrolling the page)
        - overflowY: hidden prevents vertical scroll within the slider
        - NO maxHeight (was clipping coupon cards on some devices)
        - Cards are compact (single row, small padding) so the section
          stays short and doesn't push the bottom nav off screen
      */}
      <div
        ref={scrollerRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-2 pb-1"
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          overscrollBehaviorX: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {coupons.map((c) => (
          <div
            key={c.code}
            className="snap-start shrink-0 overflow-hidden rounded-xl border"
            style={{
              borderColor: "#E8D9B8",
              background: "#FFFFFF",
              width: "min(75vw, 260px)",
            }}
          >
            {/* Single-row compact card */}
            <div className="flex items-center gap-2 p-2">
              {/* Discount badge */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-center"
                style={{ background: c.discountType === "free_delivery" ? "#2F6B45" : "#641C27" }}
              >
                {c.discountType === "percent" && (
                  <span className="text-xs font-extrabold leading-none" style={{ color: "#E5B84B" }}>{c.discountValue}%</span>
                )}
                {c.discountType === "free_delivery" && (
                  <Truck style={{ width: 16, height: 16, color: "#E5B84B" }} />
                )}
                {c.discountType === "flat" && (
                  <span className="text-[10px] font-extrabold leading-none" style={{ color: "#E5B84B" }}>{formatINR(c.discountValue)}</span>
                )}
              </div>
              {/* Details */}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-[10px] font-semibold" style={{ color: "#3D1018" }}>
                  {c.description}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <span
                    className="font-mono text-[9px] font-bold tracking-wider rounded px-1 py-0.5"
                    style={{ background: "#F5E8CF", color: "#641C27" }}
                  >
                    {c.code}
                  </span>
                  <button
                    onClick={() => copyCode(c.code)}
                    className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-bold"
                    style={{ color: "#641C27" }}
                    aria-label={`Copy ${c.code}`}
                  >
                    {copied === c.code ? <Check style={{ width: 9, height: 9, color: "#2F6B45" }} /> : <Copy style={{ width: 9, height: 9 }} />}
                    {copied === c.code ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              {/* Discount badge text */}
              <div
                className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                style={{ background: "#F5E8CF", color: "#641C27" }}
              >
                {discountBadge(c)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
