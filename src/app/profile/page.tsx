"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { BUSINESS } from "@/lib/constants";
import { Phone, MapPin, Clock, Mail, ShoppingBag, Heart, Package, LogOut, User, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useWishlist, useCart } from "@/lib/store";
import { LoyaltyWidget } from "@/components/site/loyalty-widget";
import { supabase } from "@/lib/supabase-browser";
import { useState, useEffect } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const wishlistCount = useWishlist((s) => s.items.length);
  const clearCart = useCart((s) => s.clear);
  const [profile, setProfile] = useState<{ email: string; name: string | null; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      try {
        const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const d = await res.json();
        setProfile(d.profile);
      } catch {}
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearCart();
    setProfile(null);
    toast.success("Signed out");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="shimmer h-8 w-8 rounded-full" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full" style={{ background: "#F5E8CF" }}>
            <User style={{ width: 32, height: 32, color: "#D4A83E" }} />
          </div>
          <h1 className="mt-3 text-lg font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Not signed in</h1>
          <p className="mt-1 text-sm" style={{ color: "#76544A" }}>Sign in to view your profile, orders, and saved addresses.</p>
          <button onClick={() => router.push("/login?returnTo=/profile")} className="mt-5 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1.5px solid #D4A83E" }}>
            Sign In
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

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
                  {profile.name || "Customer"}
                </h2>
                <p className="text-xs" style={{ color: "#76544A" }}>{profile.email}</p>
                {profile.phone && <p className="text-xs" style={{ color: "#76544A" }}>{profile.phone}</p>}
              </div>
              <button
                onClick={() => router.push("/address")}
                className="rounded-full p-2"
                style={{ background: "#F5E8CF" }}
                aria-label="Edit profile"
              >
                <Pencil style={{ width: 14, height: 14, color: "#641C27" }} />
              </button>
            </div>
            <button
              onClick={handleSignOut}
              className="mt-3 w-full rounded-xl border py-2.5 text-sm font-bold uppercase tracking-wide"
              style={{ borderColor: "#B91C1C", color: "#B91C1C", background: "transparent" }}
            >
              <LogOut className="inline" style={{ width: 14, height: 14 }} /> Sign Out
            </button>
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

