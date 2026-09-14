"use client";

import { Home, UtensilsCrossed, ShoppingCart, Tag } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/lib/store";
import { useState, useEffect } from "react";

const ALL_TABS = [
  { key: "/", label: "Home", icon: Home },
  { key: "/menu", label: "Menu", icon: UtensilsCrossed },
  { key: "/cart", label: "Cart", icon: ShoppingCart, badge: true },
  { key: "/offers", label: "Offers", icon: Tag },
] as const;

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const lines = useCart((s) => s.lines);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const [offersEnabled, setOffersEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOffersEnabled(d.offersEnabled ?? true))
      .catch(() => {});
  }, []);

  const tabs = offersEnabled ? ALL_TABS : ALL_TABS.filter((t) => t.key !== "/offers");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t"
      style={{ background: "#641C27", borderColor: "#3D1018" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-6xl items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = pathname === tab.key || (tab.key !== "/" && pathname.startsWith(tab.key));
          const Icon = tab.icon;
          const gold = "#E5B84B";
          const muted = "rgba(255,248,232,0.6)";
          return (
            <button
              key={tab.key}
              onClick={() => router.push(tab.key)}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
              aria-current={active ? "page" : undefined}
            >
              <span className="relative grid h-7 w-7 place-items-center" style={{ color: active ? gold : muted }}>
                <Icon style={{ width: 20, height: 20 }} />
                {"badge" in tab && tab.badge && count > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white" style={{ boxShadow: "0 0 0 2px #641C27" }}>
                    {count}
                  </span>
                )}
              </span>
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{ color: active ? gold : muted, fontFamily: "var(--font-outfit)" }}
              >
                {tab.label}
              </span>
              {active && (
                <span className="absolute -top-px h-0.5 w-8 rounded-full" style={{ background: gold }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
