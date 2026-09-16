"use client";

import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, ShoppingCart, Tag } from "lucide-react";
import { useCart } from "@/lib/store";

// All four primary tabs are ALWAYS rendered in the bottom nav, regardless of
// whether offers are enabled in admin settings. The admin "Offers Feature"
// toggle now controls ONLY the homepage coupon slider — it must NOT remove
// the Offers button from the bottom navigation (per the shop owner's
// request, September 2026). Customers should always be able to reach
// /offers to view static benefits like free-delivery thresholds, opening
// hours, and contact info, even when the admin has temporarily hidden the
// coupon slider.
const ALL_TABS = [
  { key: "/", label: "Home", icon: Home },
  { key: "/menu", label: "Menu", icon: UtensilsCrossed },
  { key: "/cart", label: "Cart", icon: ShoppingCart, badge: true },
  { key: "/offers", label: "Offers", icon: Tag },
] as const;

function BottomNavInner() {
  const pathname = usePathname();
  // Only subscribe to cart count, not the full lines array (perf optimization)
  const count = useCart((s) => s.lines.reduce((sum, l) => sum + l.qty, 0));

  const tabs = ALL_TABS;

  return (
    <nav
      // Mobile + tablet only. On desktop (md+), navigation moves into the
      // Header (see src/components/site/header.tsx) so the bottom bar doesn't
      // eat screen real estate on large displays. `md:hidden` hides the bar
      // entirely on md+ (≥768px). On mobile it remains a block element (the
      // inner div handles the flex layout) — adding `flex` here previously
      // collapsed the 4 tabs close together because it changed how the inner
      // div's width was computed.
      className="fixed inset-x-0 bottom-0 z-50 border-t md:hidden"
      style={{ background: "#641C27", borderColor: "#3D1018" }}
      aria-label="Primary mobile navigation"
    >
      <div className="mx-auto flex max-w-6xl items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = pathname === tab.key || (tab.key !== "/" && pathname.startsWith(tab.key));
          const Icon = tab.icon;
          const gold = "#E5B84B";
          const muted = "rgba(255,248,232,0.6)";
          return (
            <Link
              key={tab.key}
              href={tab.key}
              prefetch={true}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors"
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Memoize to prevent unnecessary re-renders when parent re-renders
export const BottomNav = memo(BottomNavInner);
