"use client";

import { Bell, ChevronDown, MapPin, User, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useCart } from "@/lib/store";
import { useState, useEffect } from "react";

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
  const [offersEnabled, setOffersEnabled] = useState(true);

  const isHome = pathname === "/";
  const isItemDetail = pathname.startsWith("/item/");

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOffersEnabled(d.offersEnabled ?? true))
      .catch(() => {});
  }, []);

  // Home page: full header with deliver-to, logo, icons
  if (isHome) {
    return (
      <header className="ornament-pattern top-0 z-40 text-white shadow-lg">
        <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent, #D4A83E, transparent)" }} />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-4">
          {/* Deliver to widget */}
          <button
            onClick={() => router.push("/address")}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm transition hover:bg-white/15 sm:w-56 sm:flex-none"
            aria-label="Choose delivery location"
          >
            <MapPin className="h-4 w-4 shrink-0" style={{ color: "#E5B84B" }} />
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "#E5B84B" }}>Deliver to</div>
              <div className="truncate text-sm font-semibold text-white">{address ? address.label : "Baraut, Prayagraj"}</div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/70" />
          </button>

          {/* Logo center */}
          <div className="flex flex-1 justify-center sm:mx-auto sm:flex-none">
            <button onClick={() => router.push("/")} className="flex flex-col items-center" aria-label="Shankar Sweets and Bakery home">
              <div className="relative h-12 w-28 sm:h-14 sm:w-36">
                <Image src="/images/brand/logo.png" alt="Shankar Sweets and Bakery logo" fill className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" sizes="144px" priority />
              </div>
            </button>
          </div>

          {/* Right icons */}
          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            {offersEnabled && (
              <button onClick={() => router.push("/offers")} className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-sm transition hover:bg-white/20" aria-label="Offers">
                <Bell style={{ width: 18, height: 18, color: "#fff" }} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" style={{ boxShadow: "0 0 0 2px #641C27" }} />
              </button>
            )}
            <button onClick={() => router.push("/profile")} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-sm transition hover:bg-white/20" aria-label="Account">
              <User style={{ width: 18, height: 18, color: "#fff" }} />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Non-home pages: simple header with back arrow + page title
  const title = isItemDetail ? "Item Details" : (PAGE_TITLES[pathname] || "Shankar Sweets");

  return (
    <header className="ornament-pattern top-0 z-40 text-white shadow-lg">
      <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent, #D4A83E, transparent)" }} />
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-4">
        {/* Back arrow */}
        <button
          onClick={() => router.push("/")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur-sm transition hover:bg-white/20"
          aria-label="Back to home"
        >
          <ChevronLeft style={{ width: 20, height: 20, color: "#E5B84B" }} />
        </button>

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
