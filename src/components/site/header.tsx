"use client";

import { Bell, ChevronDown, MapPin, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/store";
import { BUSINESS } from "@/lib/constants";

export function Header() {
  const router = useRouter();
  const address = useCart((s) => s.address);

  return (
    <header className="ornament-pattern sticky top-0 z-40 text-white shadow-lg">
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
            <div className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "#E5B84B" }}>
              Deliver to
            </div>
            <div className="truncate text-sm font-semibold text-white">
              {address ? address.label : "Baraut, Prayagraj"}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-white/70" />
        </button>

        {/* Logo center */}
        <div className="flex flex-1 justify-center sm:mx-auto sm:flex-none">
          <button onClick={() => router.push("/")} className="flex flex-col items-center" aria-label="Shankar Sweets and Bakery home">
            <div className="relative h-11 w-11 sm:h-12 sm:w-12">
              <Image
                src="/images/brand/logo.png"
                alt="Shankar Sweets and Bakery logo"
                fill
                className="object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
                sizes="48px"
                priority
              />
            </div>
          </button>
        </div>

        {/* Right icons */}
        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <button
            onClick={() => router.push("/offers")}
            className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-sm transition hover:bg-white/20"
            aria-label="Notifications"
          >
            <Bell style={{ width: 18, height: 18, color: "#fff" }} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2" style={{ ["--tw-ring-color" as string]: "#641C27" }} />
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-sm transition hover:bg-white/20"
            aria-label="Account"
          >
            <User style={{ width: 18, height: 18, color: "#fff" }} />
          </button>
        </div>
      </div>

      {/* Logo wordmark strip on larger screens */}
      <div className="hidden items-center justify-center gap-2 pb-2 sm:flex">
        <span className="text-base font-bold tracking-[0.2em] text-white" style={{ fontFamily: "var(--font-poppins)" }}>
          SHANKAR
        </span>
        <span style={{ color: "#E5B84B" }}>•</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/80">
          Sweets • Bakery • Ice Cream • Chaat
        </span>
        <span style={{ color: "#E5B84B" }}>•</span>
        <span className="text-[10px] font-medium tracking-wider text-white/70">Since {BUSINESS.sinceYear}</span>
      </div>
    </header>
  );
}
