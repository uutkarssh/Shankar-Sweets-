"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, Star, ShoppingBag, ChevronLeft, ChevronRight, Share2, Store, Flame } from "lucide-react";
import { useCart, useWishlist, useRecentlyViewed } from "@/lib/store";
import { formatINR, BUSINESS } from "@/lib/constants";
import { getVariants, getItemImages, type ProductItem } from "./product-card";
import { toast } from "sonner";

export function ItemDetail({ item, relatedItems }: { item: ProductItem; relatedItems?: ProductItem[] }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const wishlistHas = useWishlist((s) => s.has);
  const wishlistToggle = useWishlist((s) => s.toggle);
  const wished = wishlistHas(item.id);
  const variants = getVariants(item);
  const [variant, setVariant] = useState(variants[0]);
  const [qty, setQty] = useState(1);

  const allImages = getItemImages(item);
  const [imgIdx, setImgIdx] = useState(0);
  const hasMultiple = allImages.length > 1;

  const addRecent = useRecentlyViewed((s) => s.add);
  useEffect(() => {
    addRecent({ id: item.id, name: item.name, image: item.image ?? undefined, price: item.price });
  }, [item.id, item.name, item.image, item.price, addRecent]);

  const handleAdd = () => {
    if (!item.inStock) {
      toast.error("Out of stock");
      return;
    }
    add({ itemId: item.id, name: item.name, image: item.image ?? undefined, variant, qty });
    // No toast — user is navigated to /cart immediately
    router.push("/cart");
  };

  const shareItem = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: item.name, url }); } catch {}
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-32">
      {/* ─── Hero image (full-width square, with rounded bottom corners) ─── */}
      <div className="relative aspect-square w-full overflow-hidden rounded-b-3xl" style={{ background: "#F5E8CF" }}>
        {allImages.length > 0 ? (
           
          <img src={allImages[imgIdx] || item.image || ""} alt={item.name} className="h-full w-full object-cover transition-opacity duration-300" />
        ) : (
          <div className="grid h-full w-full place-items-center text-6xl font-bold" style={{ color: "#641C27" }}>{item.name.charAt(0)}</div>
        )}

        {/* Back + Share buttons (top corners) */}
        <button onClick={() => router.back()} className="absolute left-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-md backdrop-blur transition hover:bg-white" aria-label="Go back">
          <ChevronLeft style={{ width: 20, height: 20, color: "#641C27" }} />
        </button>
        <button onClick={shareItem} className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-md backdrop-blur transition hover:bg-white" aria-label="Share">
          <Share2 style={{ width: 18, height: 18, color: "#641C27" }} />
        </button>

        {/* Wishlist (Shankar-specific, kept) */}
        <button
          onClick={() => { wishlistToggle({ id: item.id, name: item.name, image: item.image ?? undefined, price: variant.price }); toast(wished ? "Removed from wishlist" : "Added to wishlist"); }}
          className="absolute right-4 top-16 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-md backdrop-blur transition hover:scale-110"
          aria-label="Wishlist"
        >
          <Heart style={{ width: 18, height: 18 }} className={wished ? "fill-red-500 text-red-500" : "text-[#76544A]"} />
        </button>

        {/* Carousel controls */}
        {hasMultiple && (
          <>
            <button onClick={() => setImgIdx((i) => (i - 1 + allImages.length) % allImages.length)} className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-md backdrop-blur transition hover:bg-white" aria-label="Previous image">
              <ChevronLeft style={{ width: 18, height: 18, color: "#641C27" }} />
            </button>
            <button onClick={() => setImgIdx((i) => (i + 1) % allImages.length)} className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-md backdrop-blur transition hover:bg-white" aria-label="Next image">
              <ChevronRight style={{ width: 18, height: 18, color: "#641C27" }} />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {allImages.map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)} className="h-1.5 rounded-full transition-all" style={{ width: i === imgIdx ? 16 : 6, background: i === imgIdx ? "#E5B84B" : "rgba(255,255,255,0.6)" }} aria-label={`Image ${i + 1}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── Content card (overlaps hero, pulled up, with proper spacing) ─── */}
      <div className="-mt-6 rounded-t-3xl px-5 pb-6 pt-8" style={{ background: "#FFF8E8" }}>
        {/* Title row: veg + name (left) | qty stepper (right) */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="veg-dot" />
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#76544A" }}>{item.variantType === "size" ? "Customizable" : "Fresh item"}</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>{item.name}</h1>
          </div>
          {/* Inline qty stepper */}
          <div className="flex shrink-0 items-center gap-1 rounded-full border p-1" style={{ borderColor: "#D4A83E", background: "#F5E8CF" }}>
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-white" style={{ color: "#641C27" }} aria-label="Decrease"><Minus style={{ width: 14, height: 14 }} /></button>
            <span className="min-w-6 text-center text-sm font-bold tabular-nums" style={{ color: "#3D1018" }}>{qty}</span>
            <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "#641C27", color: "#FFF8E8" }} aria-label="Increase"><Plus style={{ width: 14, height: 14 }} /></button>
          </div>
        </div>

        {/* Price */}
        <div className="mt-2">
          <span className="text-2xl font-extrabold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(variant.price)}</span>
          <span className="ml-2 text-xs font-medium" style={{ color: "#76544A" }}>per {variant.label.toLowerCase()}</span>
        </div>

        {/* Meta badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          {item.rating > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "#FEF3C7", color: "#92400E" }}>
              <Star className="fill-current" style={{ width: 12, height: 12 }} /> {item.rating.toFixed(1)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "#DBEAFE", color: "#1E40AF" }}>
            <Flame style={{ width: 12, height: 12 }} /> Fresh
          </span>
          {item.bestSeller && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "#D4A83E", color: "#3D1018" }}>Best Seller</span>
          )}
        </div>

        {/* Variant selector (Shankar-specific: size/weight) */}
        {variants.length > 1 && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Select size</div>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => (
                <button key={v.label} onClick={() => setVariant(v)} className="rounded-xl border px-4 py-2 text-sm font-semibold transition" style={{ borderColor: variant.label === v.label ? "#641C27" : "#E8D9B8", background: variant.label === v.label ? "#641C27" : "#FFFFFF", color: variant.label === v.label ? "#FFF8E8" : "#641C27" }}>
                  {v.label} · {formatINR(v.price)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {item.description && (
          <div className="mt-5">
            <h2 className="text-sm font-bold" style={{ color: "#3D1018" }}>About this dish</h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "#76544A" }}>{item.description}</p>
          </div>
        )}

        {/* Restaurant note banner */}
        <div className="mt-5 flex items-start gap-2 rounded-2xl p-3" style={{ background: "#F5E8CF" }}>
          <Store style={{ width: 18, height: 18, marginTop: 2, color: "#641C27", flexShrink: 0 }} />
          <p className="text-xs" style={{ color: "#76544A" }}>
            Prepared fresh at <strong style={{ color: "#3D1018" }}>{BUSINESS.name}</strong>. Orders cannot be cancelled once preparation begins.
          </p>
        </div>

        {/* Related items */}
        {relatedItems && relatedItems.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-bold" style={{ color: "#3D1018" }}>More from this category</h2>
            <div className="no-scrollbar -mx-5 mt-2 flex gap-3 overflow-x-auto px-5 pb-2">
              {relatedItems.map((r) => (
                <button key={r.id} onClick={() => router.push(`/item/${r.id}`)} className="w-32 shrink-0 rounded-2xl border p-2 text-left shadow-sm transition hover:shadow-md" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                  <div className="h-24 w-full overflow-hidden rounded-xl" style={{ background: "#F5E8CF" }}>
                    {r.image ? (
                       
                      <img src={r.image} alt={r.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xl font-bold" style={{ color: "#641C27" }}>{r.name.charAt(0)}</div>
                    )}
                  </div>
                  <h3 className="mt-1 line-clamp-1 text-xs font-bold" style={{ color: "#3D1018" }}>{r.name}</h3>
                  <p className="text-xs font-extrabold" style={{ color: "#641C27" }}>{formatINR(r.price)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Spacer for sticky bar */}
        <div className="h-24" />
      </div>

      {/* ─── Sticky add-to-cart bar ─── */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4" style={{ background: "#FFF8E8", borderColor: "#E8D9B8" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex-1 rounded-xl p-2" style={{ background: "#F5E8CF" }}>
            <div className="text-[10px] uppercase tracking-wide" style={{ color: "#76544A" }}>{qty} item{qty > 1 ? "s" : ""} · Total</div>
            <div className="text-base font-extrabold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(variant.price * qty)}</div>
          </div>
          <button onClick={handleAdd} disabled={!item.inStock} className="flex-[1.4] rounded-xl py-3 text-sm font-bold uppercase tracking-wide transition hover:scale-[1.02] disabled:opacity-50" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
            <span className="inline-flex items-center gap-2"><ShoppingBag style={{ width: 16, height: 16, color: "#E5B84B" }} /> Add to cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}
