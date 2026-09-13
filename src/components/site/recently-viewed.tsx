"use client";

import { useRouter } from "next/navigation";
import { useRecentlyViewed } from "@/lib/store";
import { formatINR } from "@/lib/constants";
import { History, X } from "lucide-react";

export function RecentlyViewed() {
  const router = useRouter();
  const items = useRecentlyViewed((s) => s.items);
  const clear = useRecentlyViewed((s) => s.clear);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full" style={{ background: "#D4A83E" }} />
          <h2 className="text-lg font-semibold sm:text-xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>
            Recently Viewed
          </h2>
          <History style={{ width: 16, height: 16, color: "#76544A" }} />
        </div>
        <button onClick={clear} className="text-xs font-semibold" style={{ color: "#76544A" }}>
          Clear
        </button>
      </div>
      <div className="gold-divider mt-2 mb-4">
        <svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden>
          <path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" />
        </svg>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {items.map((it, i) => (
          <button
            key={it.id}
            onClick={() => router.push(`/item/${it.id}`)}
            className="group flex w-32 shrink-0 flex-col items-center gap-2 animate-fade-in-up"
            style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
            aria-label={`View ${it.name} again`}
          >
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border" style={{ background: "#F5E8CF", borderColor: "#E8D9B8" }}>
              {it.image ? (
                 
                <img src={it.image} alt={it.name} className="h-full w-full object-cover transition group-hover:scale-105" />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-bold" style={{ color: "#641C27" }}>
                  {it.name.charAt(0)}
                </div>
              )}
              <span className="absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white" style={{ background: "#3D1018" }}>
                {formatINR(it.price)}
              </span>
            </div>
            <span className="line-clamp-1 text-center text-[11px] font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
              {it.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
