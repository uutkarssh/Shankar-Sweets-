"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { BUSINESS } from "@/lib/constants";
import { Phone, MapPin, Clock, Mail, ShoppingBag, Heart, Package, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useWishlist } from "@/lib/store";
import { LoyaltyWidget } from "@/components/site/loyalty-widget";

export default function ProfilePage() {
  const router = useRouter();
  const wishlistCount = useWishlist((s) => s.items.length);
  // Guest profile (Supabase auth can be wired later; browsing is open without login)
  const guest = true;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-3xl px-3 pt-4 sm:px-4">
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>Account</h1>
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          {/* Profile card */}
          <div className="rounded-2xl border p-5" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: "#641C27" }}>
                <User style={{ width: 28, height: 28, color: "#E5B84B" }} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
                  {guest ? "Guest" : "Customer"}
                </h2>
                <p className="text-xs" style={{ color: "#76544A" }}>{guest ? "Sign in to track orders and save addresses" : "Welcome back"}</p>
              </div>
              <button
                onClick={() => toast("Sign in opens at checkout", { description: "Login is required only at checkout." })}
                className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide"
                style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <QuickLink icon={Package} label="My Orders" desc="Track & reorder" onClick={() => router.push("/orders")} />
            <QuickLink icon={Heart} label="Wishlist" desc={`${wishlistCount} saved`} onClick={() => router.push("/wishlist")} />
            <QuickLink icon={ShoppingBag} label="Cart" desc="View items" onClick={() => router.push("/cart")} />
            <QuickLink icon={MapPin} label="Addresses" desc="Manage delivery" onClick={() => router.push("/checkout")} />
          </div>

          {/* Loyalty widget */}
          <div className="mt-4">
            <LoyaltyWidget />
          </div>

          {/* Business info */}
          <div className="mt-5 rounded-2xl p-5" style={{ background: "#641C27", color: "#FFF8E8" }}>
            <div className="gold-divider mb-3 mx-auto max-w-xs"><svg width="24" height="10" viewBox="0 0 24 10" fill="none" aria-hidden><path d="M12 0 L15 5 L12 10 L9 5 Z" fill="#D4A83E" /></svg></div>
            <h3 className="text-center text-base font-bold" style={{ fontFamily: "var(--font-poppins)" }}>{BUSINESS.name}</h3>
            <p className="mt-1 text-center text-xs italic" style={{ color: "#E5B84B" }}>{BUSINESS.tagline} • Since {BUSINESS.sinceYear}</p>
            <div className="mt-4 space-y-2 text-xs">
              <Info icon={MapPin} text={BUSINESS.address} />
              <Info icon={Phone} text={BUSINESS.phones.join(" · ")} />
              <Info icon={Clock} text={`${BUSINESS.openingTime} – ${BUSINESS.closingTime} (Daily)`} />
              <Info icon={Mail} text="shankarsweets@baraut.in" />
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function QuickLink({ icon: Icon, label, desc, onClick }: { icon: React.ElementType; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition hover:scale-[1.02]" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
      <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "#F5E8CF" }}><Icon style={{ width: 16, height: 16, color: "#641C27" }} /></div>
      <div>
        <div className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{label}</div>
        <div className="text-[11px]" style={{ color: "#76544A" }}>{desc}</div>
      </div>
    </button>
  );
}

function Info({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon style={{ width: 14, height: 14, color: "#E5B84B" }} />
      <span style={{ color: "rgba(255,248,232,0.9)" }}>{text}</span>
    </div>
  );
}

