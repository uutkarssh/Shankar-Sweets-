"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useCart } from "@/lib/store";
import { formatINR } from "@/lib/constants";
import { ShoppingBag, ArrowRight } from "lucide-react";

/**
 * CartToast — a persistent floating cart summary bar that sits above the
 * bottom navigation bar.
 *
 * Behavior:
 * - Appears whenever the cart has items
 * - PERSISTS until the cart is emptied (i.e. after order placement)
 * - No auto-hide, no dismiss button — the only way to remove it is to
 *   complete checkout (which clears the cart) or remove all items
 * - ONLY visible on the homepage (/) and menu (/menu) pages
 * - Hidden everywhere else: /cart, /checkout, /admin/*, /profile, /orders,
 *   /offers, /address, /wishlist, /item/[id], /contact, /login
 *
 * HEIGHT MEASUREMENT:
 *   The bar is position:fixed and overlays scrollable content. To prevent
 *   content from being hidden behind it, the bar measures its own rendered
 *   height via a ResizeObserver and publishes it as a CSS variable
 *   (--cart-toast-height) on document.documentElement.
 *
 *   Pages with scrollable content below the fold (Home, Menu) use the
 *   .pb-safe-cart class, which adds padding-bottom equal to:
 *     6rem (bottom nav space) + var(--cart-toast-height)
 *
 *   When the bar is not visible (cart empty or wrong page), the CSS
 *   variable is set to 0px so the extra padding disappears.
 *
 * Design: solid burgundy gradient background, white text, gold border,
 * rounded corners, spans full width with small side margins.
 */
export function CartToast() {
  const router = useRouter();
  const pathname = usePathname();
  const count = useCart((s) => s.count());
  const subtotal = useCart((s) => s.subtotal());
  const barRef = useRef<HTMLDivElement>(null);

  // Only show on home (/) and menu (/menu) pages
  const isAllowedPage = pathname === "/" || pathname === "/menu";
  const visible = count > 0 && isAllowedPage;

  // ─── Measure the bar's rendered height + publish via CSS variable ───
  // This runs on every render (visible toggles, pathname changes, count
  // changes). When visible, the ResizeObserver tracks height changes
  // (e.g. from font scaling, viewport rotation, or content changes).
  // When not visible, the CSS variable is set to 0px so pages don't
  // reserve unnecessary bottom padding.
  useEffect(() => {
    const el = barRef.current;

    if (!visible || !el) {
      // Bar not rendered — no extra padding needed
      document.documentElement.style.setProperty("--cart-toast-height", "0px");
      return;
    }

    const updateHeight = () => {
      const h = el.offsetHeight;
      // Include a small gap (12px) between the bar and the content above it
      // so content isn't touching the bar.
      document.documentElement.style.setProperty("--cart-toast-height", `${h + 12}px`);
    };

    // Measure immediately (in case the bar was already rendered)
    updateHeight();

    // Track height changes (font scaling, viewport rotation, etc.)
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);

    return () => {
      ro.disconnect();
      // When the bar unmounts (cart emptied or page changed), reset to 0
      document.documentElement.style.setProperty("--cart-toast-height", "0px");
    };
  }, [visible]);

  // Don't render anything if cart is empty or we're not on an allowed page
  if (!visible) return null;

  const itemCountText = count === 1 ? "1 item added" : `${count} items added`;

  const handleViewCart = () => {
    router.push("/cart");
  };

  return (
    <div
      ref={barRef}
      // bottom-20 (80px) on mobile sits the toast just above the bottom nav
      // (~64px tall). On desktop (md+) the bottom nav is hidden, so we drop
      // to bottom-6 (24px) to hug the bottom of the viewport instead of
      // floating with a big empty gap below it.
      className="fixed bottom-20 left-3 right-3 z-40 transition-all duration-300 ease-out translate-y-0 opacity-100 md:bottom-6"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #641C27 0%, #3D1018 100%)",
          border: "1px solid #D4A83E",
        }}
      >
        {/* Left: cart icon + item count */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
              <ShoppingBag style={{ width: 16, height: 16, color: "#E5B84B" }} />
            </div>
            <span
              className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ background: "#B91C1C", border: "1.5px solid #FFF8E8" }}
            >
              {count}
            </span>
          </div>
          <span className="text-sm font-semibold truncate" style={{ color: "#FFF8E8", fontFamily: "var(--font-outfit)" }}>
            {itemCountText}
          </span>
        </div>

        {/* Right: price + View Cart button */}
        <button
          onClick={handleViewCart}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition hover:scale-105 shrink-0"
          style={{ background: "#D4A83E", color: "#3D1018" }}
        >
          <span>{formatINR(subtotal)}</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>View Cart</span>
          <ArrowRight style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </div>
  );
}
