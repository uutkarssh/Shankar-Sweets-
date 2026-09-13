"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, Star, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import { useCart, useWishlist } from "@/lib/store";
import { formatINR } from "@/lib/constants";
import { getVariants, getItemImages, type ProductItem } from "./product-card";
import { toast } from "sonner";

export function ItemDetail({ item }: { item: ProductItem }) {
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

  const handleAdd = () => {
    if (!item.inStock) {
      toast.error("Out of stock");
      return;
    }
    add({ itemId: item.id, name: item.name, image: item.image ?? undefined, variant, qty });
    toast.success(`${qty} × ${item.name} added`, { description: `${variant.label} — ${formatINR(variant.price * qty)}` });
    router.push("/cart");
  };

  return (
    <div className="mx-auto max-w-3xl px-3 pb-32 pt-3 sm:px-4">
      {/* Image carousel */}
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl border" style={{ background: "#F5E8CF", borderColor: "#E8D9B8" }}>
        {allImages.length > 0 ? (
           
          <img src={allImages[imgIdx] || item.image || ""} alt={item.name} className="h-full w-full object-cover transition-opacity duration-300" />
        ) : (
          <div className="grid h-full w-full place-items-center text-6xl font-bold" style={{ color: "#641C27" }}>
            {item.name.charAt(0)}
          </div>
        )}
        <div className="absolute left-3 top-3"><span className="veg-dot" /></div>
        <button
          onClick={() => {
            wishlistToggle({ id: item.id, name: item.name, image: item.image ?? undefined, price: variant.price });
            toast(wished ? "Removed from wishlist" : "Added to wishlist");
          }}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white shadow-md transition hover:scale-110"
          aria-label="Wishlist"
        >
          <Heart style={{ width: 16, height: 16 }} className={wished ? "fill-red-500 text-red-500" : "text-[#76544A]"} />
        </button>
        <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow" style={{ background: "#3D1018" }}>
          <Star className="fill-current" style={{ width: 12, height: 12, color: "#E5B84B" }} />
          {item.rating.toFixed(1)} <span className="font-normal opacity-70">({item.ratingCount})</span>
        </div>
        {item.bestSeller && (
          <div className="absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow" style={{ background: "linear-gradient(90deg,#D4A83E,#E5B84B)", color: "#3D1018" }}>
            Best Seller
          </div>
        )}

        {/* Carousel controls */}
        {hasMultiple && (
          <>
            <button
              onClick={() => setImgIdx((i) => (i - 1 + allImages.length) % allImages.length)}
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow-md backdrop-blur transition hover:bg-white"
              aria-label="Previous image"
            >
              <ChevronLeft style={{ width: 18, height: 18, color: "#641C27" }} />
            </button>
            <button
              onClick={() => setImgIdx((i) => (i + 1) % allImages.length)}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow-md backdrop-blur transition hover:bg-white"
              aria-label="Next image"
            >
              <ChevronRight style={{ width: 18, height: 18, color: "#641C27" }} />
            </button>
            {/* Thumbnail dots */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === imgIdx ? 16 : 6,
                    background: i === imgIdx ? "#E5B84B" : "rgba(255,255,255,0.6)",
                  }}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip for multiple images */}
      {hasMultiple && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setImgIdx(i)}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition"
              style={{
                borderColor: i === imgIdx ? "#641C27" : "#E8D9B8",
                opacity: i === imgIdx ? 1 : 0.6,
              }}
              aria-label={`View image ${i + 1}`}
            >
              { }
              <img src={img} alt={`${item.name} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-4">
        <div className="gold-divider mb-3"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>
        <h1 className="text-2xl font-bold leading-tight" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{item.name}</h1>
        <p className="mt-1 text-sm" style={{ color: "#76544A" }}>{item.description || "Delicious and freshly prepared."}</p>
        <div className="mt-2 text-2xl font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
          {formatINR(variant.price)}
        </div>
      </div>

      {/* Variants */}
      {variants.length > 1 && (
        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Select size</div>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.label}
                onClick={() => setVariant(v)}
                className="rounded-xl border px-4 py-2 text-sm font-semibold transition"
                style={{
                  borderColor: variant.label === v.label ? "#641C27" : "#E8D9B8",
                  background: variant.label === v.label ? "#641C27" : "#FFFFFF",
                  color: variant.label === v.label ? "#FFF8E8" : "#641C27",
                }}
              >
                {v.label} · {formatINR(v.price)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Quantity</div>
        <div className="inline-flex items-center gap-3 rounded-xl border px-3 py-2" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "#F5E8CF", color: "#641C27" }} aria-label="Decrease"><Minus style={{ width: 14, height: 14 }} /></button>
          <span className="min-w-6 text-center text-base font-bold" style={{ color: "#3D1018" }}>{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "#F5E8CF", color: "#641C27" }} aria-label="Increase"><Plus style={{ width: 14, height: 14 }} /></button>
        </div>
      </div>

      {/* Sticky add bar */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4" style={{ background: "#FFFFFF", borderColor: "#E8D9B8" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Total</div>
            <div className="text-lg font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(variant.price * qty)}</div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!item.inStock}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide transition hover:scale-[1.02] disabled:opacity-50"
            style={{ background: "#641C27", color: "#FFF8E8", border: "1.5px solid #D4A83E" }}
          >
            <ShoppingBag style={{ width: 16, height: 16, color: "#E5B84B" }} />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
