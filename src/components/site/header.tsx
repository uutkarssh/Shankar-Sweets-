"use client";

import { Bell, ChevronDown, MapPin, User, ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/lib/store";
import { useConfig } from "@/components/site/use-config";

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

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const address = useCart((s) => s.address);
  const offersEnabled = useConfig();

  const isHome = pathname === "/";
  const isItemDetail = pathname.startsWith("/item/");

  // Home page: full header with deliver-to, logo, icons
  if (isHome) {
    return (
      <header className="ornament-pattern top-0 z-40 text-white shadow-lg">
        <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent, #D4A83E, transparent)" }} />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-4">
          {/* Deliver to widget */}
          <Link
            href="/address"
            prefetch={true}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm transition hover:bg-white/15 sm:w-56 sm:flex-none"
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
        {/* Back arrow — hidden on cart/checkout/payment pages */}
        {!showNoBackArrow && (
          <Link
            href="/"
            prefetch={true}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur-sm transition hover:bg-white/20"
            aria-label="Back to home"
          >
            <ChevronLeft style={{ width: 20, height: 20, color: "#E5B84B" }} />
          </Link>
        )}

        {/* Page title */}
        <h1 className="flex-1 text-center text-base font-bold tracking-wide sm:text-lg" style={{ fontFamily: "var(--font-poppins)" }}>
          {title}
        </h1>

        {/* Spacer to balance the back arrow */}
        <div className="h-9 w-9 shrink-0" />
      </div>
    </header>
  );
}
