"use client";

import { useRouter, usePathname } from "next/navigation";
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
 * - Hidden on /cart and /checkout (where the user is already in the cart
 *   flow)
 * - Visible on all other pages (homepage, menu, item detail, profile, etc.)
 *
 * Design: solid burgundy gradient background, white text, gold border,
 * rounded corners, spans full width with small side margins. Matches the
 * reference image provided by the user.
 */
export function CartToast() {
  const router = useRouter();
  const pathname = usePathname();
  const count = useCart((s) => s.count());
  const subtotal = useCart((s) => s.subtotal());

  // Don't show on cart/checkout pages — the user is already in the cart flow
  const isCartPage = pathname === "/cart" || pathname === "/checkout";

  // Don't render anything if cart is empty or we're on cart/checkout
  if (count === 0 || isCartPage) return null;

  const itemCountText = count === 1 ? "1 item added" : `${count} items added`;

  const handleViewCart = () => {
    router.push("/cart");
  };

  return (
    <div
      className="fixed bottom-20 left-3 right-3 z-40 transition-all duration-300 ease-out translate-y-0 opacity-100"
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
