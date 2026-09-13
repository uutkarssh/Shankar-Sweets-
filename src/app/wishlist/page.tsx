"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { useWishlist, useCart } from "@/lib/store";
import { formatINR } from "@/lib/constants";
import { Heart, Trash2, Plus, ArrowRight, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function WishlistPage() {
  const router = useRouter();
  const items = useWishlist((s) => s.items);
  const remove = useWishlist((s) => s.remove);
  const clear = useWishlist((s) => s.clear);
  const addToCart = useCart((s) => s.add);

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <div className="grid h-24 w-24 place-items-center rounded-full" style={{ background: "#F5E8CF" }}>
            <Heart style={{ width: 40, height: 40, color: "#D4A83E" }} />
          </div>
          <h1 className="mt-4 text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Your wishlist is empty</h1>
          <p className="mt-1 text-sm" style={{ color: "#76544A" }}>Tap the heart icon on any item to save it here.</p>
          <button
            onClick={() => router.push("/menu")}
            className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide"
            style={{ background: "#641C27", color: "#FFF8E8", border: "1.5px solid #D4A83E" }}
          >
            Browse Menu <ArrowRight style={{ width: 14, height: 14, color: "#E5B84B" }} />
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
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>
              Wishlist
            </h1>
            <button onClick={() => { clear(); toast.success("Wishlist cleared"); }} className="text-xs font-semibold" style={{ color: "#76544A" }}>
              Clear all
            </button>
          </div>
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {items.map((it) => (
              <div key={it.id} className="product-card flex flex-col">
                <div className="relative p-2.5">
                  <button
                    onClick={() => router.push(`/item/${it.id}`)}
                    className="relative block aspect-square w-full overflow-hidden rounded-2xl"
                    style={{ background: "#F5E8CF" }}
                    aria-label={`View ${it.name}`}
                  >
                    {it.image ? (
                       
                      <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-3xl font-bold" style={{ color: "#641C27" }}>{it.name.charAt(0)}</div>
                    )}
                  </button>
                  <div className="absolute left-4 top-4">
                    <Heart className="fill-red-500 text-red-500" style={{ width: 16, height: 16 }} />
                  </div>
                  <button
                    onClick={() => { remove(it.id); toast.success("Removed from wishlist"); }}
                    className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-white shadow-md"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 style={{ width: 13, height: 13, color: "#B91C1C" }} />
                  </button>
                </div>
                <div className="flex flex-1 flex-col px-3 pb-3">
                  <h3 className="line-clamp-1 text-sm font-semibold leading-tight" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{it.name}</h3>
                  <div className="mt-auto flex items-center justify-between pt-2.5">
                    <div className="text-base font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(it.price)}</div>
                    <button
                      onClick={() => {
                        addToCart({ itemId: it.id, name: it.name, image: it.image, variant: { label: "Regular", price: it.price }, qty: 1 });
                        toast.success(`${it.name} added to cart`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition hover:scale-105"
                      style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
                    >
                      <Plus style={{ width: 12, height: 12, color: "#E5B84B" }} />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl p-4 text-center" style={{ background: "#641C27", color: "#FFF8E8" }}>
            <ShoppingBag style={{ width: 24, height: 24, margin: "0 auto", color: "#E5B84B" }} />
            <p className="mt-2 text-sm font-semibold" style={{ fontFamily: "var(--font-poppins)" }}>{items.length} item{items.length !== 1 ? "s" : ""} saved</p>
            <button
              onClick={() => router.push("/menu")}
              className="mt-3 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wide"
              style={{ background: "#FFF8E8", color: "#641C27" }}
            >
              Add More <ArrowRight style={{ width: 12, height: 12 }} />
            </button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
