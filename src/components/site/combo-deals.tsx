"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/store";
import { formatINR } from "@/lib/constants";
import { Plus, Sparkles, Tag, Check } from "lucide-react";
import { toast } from "sonner";

export type ComboDeal = {
  id: string;
  title: string;
  subtitle: string;
  items: { itemId: string; name: string; image?: string; price: number }[];
  comboPrice: number;
  image?: string;
  badge?: string;
};

export function ComboDeals({ deals }: { deals: ComboDeal[] }) {
  const router = useRouter();
  const add = useCart((s) => s.add);

  if (deals.length === 0) return null;

  const addCombo = (deal: ComboDeal) => {
    deal.items.forEach((it) => {
      add({
        itemId: it.itemId,
        name: it.name,
        image: it.image,
        variant: { label: "Combo", price: it.price },
        qty: 1,
      });
    });
    toast.success(`${deal.title} added to cart`, { description: `Combo price ${formatINR(deal.comboPrice)}` });
    router.push("/cart");
  };

  return (
    <section className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full" style={{ background: "#D4A83E" }} />
          <h2 className="text-lg font-semibold sm:text-xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>
            Combo Deals
          </h2>
          <Sparkles style={{ width: 16, height: 16, color: "#E5B84B" }} />
        </div>
      </div>
      <div className="gold-divider mt-2 mb-4">
        <svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden>
          <path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" />
        </svg>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {deals.map((deal, i) => {
          const originalTotal = deal.items.reduce((s, it) => s + it.price, 0);
          const savings = originalTotal - deal.comboPrice;
          return (
            <div
              key={deal.id}
              className="animate-card-pop relative w-72 shrink-0 overflow-hidden rounded-3xl border"
              style={{ borderColor: "#D4A83E", background: "#FFFFFF", animationDelay: `${i * 80}ms` }}
            >
              {/* Badge */}
              {deal.badge && (
                <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider shadow" style={{ background: "linear-gradient(90deg,#D4A83E,#E5B84B)", color: "#3D1018" }}>
                  <Tag style={{ width: 9, height: 9 }} /> {deal.badge}
                </div>
              )}
              {/* Savings badge */}
              {savings > 0 && (
                <div className="absolute right-3 top-3 z-10 rounded-full px-2.5 py-1 text-[9px] font-bold text-white shadow" style={{ background: "#2F6B45" }}>
                  Save {formatINR(savings)}
                </div>
              )}

              <div className="p-4">
                <h3 className="text-base font-bold leading-tight" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
                  {deal.title}
                </h3>
                <p className="mt-0.5 text-[11px]" style={{ color: "#76544A" }}>{deal.subtitle}</p>

                {/* Mini item thumbnails */}
                <div className="mt-3 flex -space-x-3">
                  {deal.items.slice(0, 4).map((it, idx) => (
                    <div
                      key={idx}
                      className="h-12 w-12 overflow-hidden rounded-full border-2"
                      style={{ borderColor: "#FFFFFF", background: "#F5E8CF", zIndex: 10 - idx }}
                    >
                      {it.image ? (
                         
                        <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs font-bold" style={{ color: "#641C27" }}>{it.name.charAt(0)}</div>
                      )}
                    </div>
                  ))}
                  {deal.items.length > 4 && (
                    <div className="grid h-12 w-12 place-items-center rounded-full border-2 text-[10px] font-bold" style={{ borderColor: "#FFFFFF", background: "#641C27", color: "#E5B84B" }}>
                      +{deal.items.length - 4}
                    </div>
                  )}
                </div>

                {/* Item names */}
                <div className="mt-2 space-y-0.5">
                  {deal.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px]" style={{ color: "#3D1018" }}>
                      <Check style={{ width: 10, height: 10, color: "#2F6B45" }} />
                      <span className="line-clamp-1">{it.name}</span>
                    </div>
                  ))}
                </div>

                {/* Price + add */}
                <div className="mt-3 flex items-end justify-between border-t pt-3" style={{ borderColor: "#E8D9B8" }}>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider line-through" style={{ color: "#76544A" }}>
                      {formatINR(originalTotal)}
                    </div>
                    <div className="text-xl font-extrabold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
                      {formatINR(deal.comboPrice)}
                    </div>
                  </div>
                  <button
                    onClick={() => addCombo(deal)}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition hover:scale-105"
                    style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
                  >
                    <Plus style={{ width: 12, height: 12, color: "#E5B84B" }} />
                    Add Combo
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
