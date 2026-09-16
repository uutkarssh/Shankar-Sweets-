"use client";

import { Bell, ChevronDown, MapPin, User, ChevronLeft, Home, UtensilsCrossed, Tag, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/lib/store";

// Page titles for non-home pages
const PAGE_TITLES: Record<string, string> = {
  "/menu": "Menu",
  "/cart": "Your Cart",
  "/checkout": "Checkout",
  "/payment": "UPI Payment",
  "/address": "Select Location",
  "/orders": "My Orders",
  "/offers": "Offers",
  "/profile": "Account",
  "/contact": "Contact & About",
  "/wishlist": "Wishlist",
};

// Desktop navigation links — shown in the header on md+ screens.
// On mobile/tablet, navigation lives in the bottom bar instead
// (see src/components/site/bottom-nav.tsx).
const DESKTOP_NAV = [
  { key: "/", label: "Home", icon: Home },
  { key: "/menu", label: "Menu", icon: UtensilsCrossed },
  { key: "/offers", label: "Offers", icon: Tag },
] as const;

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const address = useCart((s) => s.address);
  // Cart count — used for the desktop cart badge
  const cartCount = useCart((s) => s.lines.reduce((sum, l) => sum + l.qty, 0));

  const isHome = pathname === "/";
  const isItemDetail = pathname.startsWith("/item/");

  // Home page: full header with deliver-to, logo, icons
  if (isHome) {
    return (
      <header className="ornament-pattern top-0 z-40 text-white shadow-lg">
        <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent, #D4A83E, transparent)" }} />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-4">
          {/* Deliver to widget — mobile only on home (gets crowded on desktop once nav links appear) */}
          <Link
            href="/address"
            prefetch={true}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm transition hover:bg-white/15 sm:w-56 sm:flex-none md:hidden"
            aria-label="Choose delivery location"
          >
            <MapPin className="h-4 w-4 shrink-0" style={{ color: "#E5B84B" }} />
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "#E5B84B" }}>Deliver to</div>
              <div className="truncate text-sm font-semibold text-white">{address ? address.label : "Baraut, Prayagraj"}</div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/70" />
          </Link>

          {/* Desktop: Deliver-to widget (compact, left-aligned) */}
          <Link
            href="/address"
            prefetch={true}
            className="hidden min-w-0 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm transition hover:bg-white/15 md:flex md:w-56"
            aria-label="Choose delivery location"
          >
            <MapPin className="h-4 w-4 shrink-0" style={{ color: "#E5B84B" }} />
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "#E5B84B" }}>Deliver to</div>
              <div className="truncate text-sm font-semibold text-white">{address ? address.label : "Baraut, Prayagraj"}</div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/70" />
          </Link>

          {/* Logo center — uses dedicated header-logo.png (NOT the PWA icon) */}
          <div className="flex flex-1 justify-center sm:mx-auto sm:flex-none">
            <Link href="/" prefetch={true} className="flex flex-col items-center" aria-label="Shankar Sweets and Bakery home">
              <div className="relative h-16 w-36 sm:h-20 sm:w-44">
                <Image src="/images/brand/header-logo.png" alt="Shankar Sweets and Bakery logo" fill className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" sizes="176px" priority />
              </div>
            </Link>
          </div>

          {/* Right icons */}
          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            {/* Desktop nav links — hidden on mobile (mobile uses bottom nav) */}
            <nav className="hidden items-center gap-1 md:flex" aria-label="Desktop primary">
              {DESKTOP_NAV.map((item) => {
                const active = pathname === item.key || (item.key !== "/" && pathname.startsWith(item.key));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.key}
                    prefetch={true}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide transition"
                    style={{
                      background: active ? "rgba(229, 184, 75, 0.18)" : "rgba(255,255,255,0.08)",
                      color: active ? "#E5B84B" : "#FFF8E8",
                      border: `1px solid ${active ? "rgba(229, 184, 75, 0.4)" : "transparent"}`,
                    }}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon style={{ width: 14, height: 14 }} />
                    {item.label}
                  </Link>
                );
              })}
              {/* Cart with badge */}
              <Link
                href="/cart"
                prefetch={true}
                className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide transition"
                style={{
                  background: pathname === "/cart" ? "rgba(229, 184, 75, 0.18)" : "rgba(255,255,255,0.08)",
                  color: pathname === "/cart" ? "#E5B84B" : "#FFF8E8",
                  border: `1px solid ${pathname === "/cart" ? "rgba(229, 184, 75, 0.4)" : "transparent"}`,
                }}
                aria-current={pathname === "/cart" ? "page" : undefined}
              >
                <ShoppingCart style={{ width: 14, height: 14 }} />
                Cart
                {cartCount > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white" style={{ boxShadow: "0 0 0 2px #641C27" }}>
                    {cartCount}
                  </span>
                )}
              </Link>
            </nav>

            {/* Notification bell — redirects to orders page (order tracking), not offers */}
            <Link
              href="/orders"
              prefetch={true}
              className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-sm transition hover:bg-white/20"
              aria-label="View your orders"
            >
              <Bell style={{ width: 18, height: 18, color: "#fff" }} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" style={{ boxShadow: "0 0 0 2px #641C27" }} />
            </Link>
            <Link href="/profile" prefetch={true} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-sm transition hover:bg-white/20" aria-label="Account">
              <User style={{ width: 18, height: 18, color: "#fff" }} />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // Item detail page: NO header bar — the hero image has its own back button
  if (isItemDetail) {
    return null;
  }

  // Payment flow pages: header with title only, NO back arrow.
  const noBackArrowPages = ["/cart", "/checkout", "/payment"];
  const showNoBackArrow = noBackArrowPages.includes(pathname);

  // Non-home pages: simple header with back arrow + page title
  const title = PAGE_TITLES[pathname] || "Shankar Sweets";

  return (
    <header className="ornament-pattern top-0 z-40 text-white shadow-lg">
      <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent, #D4A83E, transparent)" }} />
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-4">
        {/* Back arrow — hidden on cart/checkout/payment pages AND on desktop (desktop uses nav links instead) */}
        {!showNoBackArrow && (
          <Link
            href="/"
            prefetch={true}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur-sm transition hover:bg-white/20 md:hidden"
            aria-label="Back to home"
          >
            <ChevronLeft style={{ width: 20, height: 20, color: "#E5B84B" }} />
          </Link>
        )}

        {/* Mobile: Page title (centered) */}
        <h1 className="flex-1 text-center text-base font-bold tracking-wide sm:text-lg md:hidden" style={{ fontFamily: "var(--font-poppins)" }}>
          {title}
        </h1>

        {/* Desktop: Logo (left) + nav links (center-right) + icons (right) */}
        {/* Shown on md+ in place of the mobile title+back layout */}
        <div className="hidden flex-1 items-center gap-4 md:flex">
          <Link href="/" prefetch={true} className="flex shrink-0 items-center" aria-label="Shankar Sweets and Bakery home">
            <div className="relative h-10 w-24">
              <Image src="/images/brand/header-logo.png" alt="Shankar Sweets and Bakery logo" fill className="object-contain" sizes="96px" />
            </div>
          </Link>
          <h1 className="flex-1 text-center text-base font-bold tracking-wide lg:text-lg" style={{ fontFamily: "var(--font-poppins)" }}>
            {title}
          </h1>
          <nav className="flex items-center gap-1" aria-label="Desktop primary">
            {DESKTOP_NAV.map((item) => {
              const active = pathname === item.key || (item.key !== "/" && pathname.startsWith(item.key));
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.key}
                  prefetch={true}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide transition"
                  style={{
                    background: active ? "rgba(229, 184, 75, 0.18)" : "rgba(255,255,255,0.08)",
                    color: active ? "#E5B84B" : "#FFF8E8",
                    border: `1px solid ${active ? "rgba(229, 184, 75, 0.4)" : "transparent"}`,
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon style={{ width: 14, height: 14 }} />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/cart"
              prefetch={true}
              className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide transition"
              style={{
                background: pathname === "/cart" ? "rgba(229, 184, 75, 0.18)" : "rgba(255,255,255,0.08)",
                color: pathname === "/cart" ? "#E5B84B" : "#FFF8E8",
                border: `1px solid ${pathname === "/cart" ? "rgba(229, 184, 75, 0.4)" : "transparent"}`,
              }}
              aria-current={pathname === "/cart" ? "page" : undefined}
            >
              <ShoppingCart style={{ width: 14, height: 14 }} />
              Cart
              {cartCount > 0 && (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white" style={{ boxShadow: "0 0 0 2px #641C27" }}>
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/orders"
              prefetch={true}
              className="relative grid h-9 w-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
              aria-label="View your orders"
            >
              <Bell style={{ width: 16, height: 16, color: "#fff" }} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" style={{ boxShadow: "0 0 0 2px #641C27" }} />
            </Link>
            <Link href="/profile" prefetch={true} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/20" aria-label="Account">
              <User style={{ width: 16, height: 16, color: "#fff" }} />
            </Link>
          </nav>
        </div>

        {/* Spacer to balance the back arrow on mobile (when no back arrow is shown) */}
        {showNoBackArrow && <div className="h-9 w-9 shrink-0 md:hidden" />}
        {!showNoBackArrow && <div className="h-9 w-9 shrink-0 md:hidden" />}
      </div>
    </header>
  );
}
