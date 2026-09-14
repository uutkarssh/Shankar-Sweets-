"use client";

import { Heart, Plus, Minus, Star } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, useWishlist } from "@/lib/store";
import { formatINR } from "@/lib/constants";
import { toast } from "sonner";

export type ProductItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceSmall: number | null;
  priceLarge: number | null;
  priceHalf: number | null;
  priceFull: number | null;
  weightBased: boolean;
  variantType: string;
  image: string | null;
  images: string | null;
  rating: number;
  ratingCount: number;
  bestSeller: boolean;
  veg: boolean;
  inStock: boolean;
};

/** Parse the images JSON field (or fall back to single image) into an array of URLs. */
export function getItemImages(item: Pick<ProductItem, "image" | "images">): string[] {
  const imgs: string[] = [];
  if (item.images) {
    try {
      const parsed = JSON.parse(item.images);
      if (Array.isArray(parsed)) imgs.push(...parsed.filter(Boolean));
    } catch {
      // ignore
    }
  }
  if (item.image && !imgs.includes(item.image)) imgs.unshift(item.image);
  return imgs;
}

export type VariantOption = { label: string; price: number };

export function getVariants(item: ProductItem): VariantOption[] {
  switch (item.variantType) {
    case "size":
      return [
        { label: "Small", price: item.priceSmall ?? item.price },
        { label: "Large", price: item.priceLarge ?? item.price },
      ];
    case "portion":
      return [
        { label: "Half", price: item.priceHalf ?? item.price },
        { label: "Full", price: item.priceFull ?? item.price },
      ];
    case "weight":
      return [
        { label: "250g", price: (item as any).pricePer250 ?? item.price },
        { label: "500g", price: (item as any).pricePer500 ?? item.price },
        { label: "1kg", price: (item as any).pricePerKg ?? item.price },
      ];
    case "count":
      return [{ label: "1 pc", price: item.price }];
    default:
      return [{ label: "Regular", price: item.price }];
  }
}

export function ProductCard({ item }: { item: ProductItem }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const cartLines = useCart((s) => s.lines);
  const wishlistHas = useWishlist((s) => s.has);
  const wishlistToggle = useWishlist((s) => s.toggle);
  const wished = wishlistHas(item.id);
  const variants = getVariants(item);
  const [variant, setVariant] = useState<VariantOption>(variants[0]);

  // Check if this item+variant is already in cart
  const cartLine = cartLines.find((l) => l.itemId === item.id && l.variant.label === variant.label);
  const inCartQty = cartLine?.qty || 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.inStock) {
      toast.error("Out of stock", { description: `${item.name} is currently unavailable.` });
      return;
    }
    add({
      itemId: item.id,
      name: item.name,
      image: item.image ?? undefined,
      variant,
      qty: 1,
    });
    toast.success(`${item.name} added`);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQty(item.id, variant.label, inCartQty + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQty(item.id, variant.label, inCartQty - 1);
  };

  const openDetail = () => router.push(`/item/${item.id}`);

  return (
    <div className="product-card flex flex-col">
      {/* Image with fully rounded corners */}
      <div className="relative p-2.5">
        <button
          onClick={openDetail}
          className="relative block aspect-square w-full overflow-hidden rounded-2xl"
          style={{ background: "#F5E8CF" }}
          aria-label={`View ${item.name}`}
        >
          {item.image ? (
             
            <img src={item.image} alt={item.name} className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : (
            <div className="grid h-full w-full place-items-center text-3xl font-bold" style={{ color: "#641C27" }}>
              {item.name.charAt(0)}
            </div>
          )}
        </button>

        {/* Veg indicator top-left */}
        <div className="absolute left-4 top-4">
          <span className="veg-dot" aria-label={item.veg ? "Vegetarian" : "Non-vegetarian"} />
        </div>

        {/* Wishlist top-right */}
        <button
          onClick={(e) => { e.stopPropagation(); wishlistToggle({ id: item.id, name: item.name, image: item.image ?? undefined, price: variant.price }); toast(wished ? "Removed from wishlist" : "Added to wishlist"); }}
          className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-white shadow-md transition hover:scale-110"
          aria-label="Add to wishlist"
        >
          <Heart style={{ width: 14, height: 14 }} className={wished ? "fill-red-500 text-red-500" : "text-[#76544A]"} />
        </button>

        {/* Rating badge bottom-left */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow" style={{ background: "#3D1018" }}>
          <Star className="fill-current" style={{ width: 10, height: 10, color: "#E5B84B" }} />
          {item.rating.toFixed(1)}
        </div>

        {/* Best seller badge */}
        {item.bestSeller && item.inStock && (
          <div className="absolute bottom-4 right-4 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow" style={{ background: "linear-gradient(90deg, #D4A83E, #E5B84B)", color: "#3D1018" }}>
            Best Seller
          </div>
        )}

        {/* Out of stock badge */}
        {!item.inStock && (
          <div className="absolute bottom-4 right-4 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow" style={{ background: "#B91C1C" }}>
            Out of Stock
          </div>
        )}
      </div>

      {/* Body — greyed out if out of stock */}
      <div className={`flex flex-1 flex-col px-3 pb-3 ${!item.inStock ? "opacity-50" : ""}`}>
        <button onClick={openDetail} className="text-left">
          <h3 className="line-clamp-1 text-sm font-semibold leading-tight" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
            {item.name}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] min-h-[1rem]" style={{ color: "#76544A" }}>
            {item.description || "Delicious and freshly prepared."}
          </p>
        </button>

        {/* Variant selector (Shankar-specific: size/weight) */}
        {variants.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {variants.map((v) => (
              <button
                key={v.label}
                onClick={(e) => { e.stopPropagation(); setVariant(v); }}
                className="rounded-md border px-2 py-0.5 text-[10px] font-semibold transition"
                style={{
                  borderColor: variant.label === v.label ? "#641C27" : "#E8D9B8",
                  background: variant.label === v.label ? "#641C27" : "#FFF8E8",
                  color: variant.label === v.label ? "#FFF8E8" : "#641C27",
                  fontFamily: "var(--font-outfit)",
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        {/* Price + ADD/Stepper (sibling, not inside clickable) */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
          <div className="text-base font-extrabold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
            {formatINR(variant.price)}
          </div>
          {inCartQty > 0 ? (
            <div className="flex items-center gap-1 rounded-full border p-1" style={{ borderColor: "#D4A83E", background: "#FFF8E8" }}>
              <button onClick={handleDecrement} className="grid h-7 w-7 place-items-center rounded-full bg-white transition hover:bg-[#F5E8CF]" aria-label="Decrease">
                <Minus style={{ width: 12, height: 12, color: "#641C27" }} />
              </button>
              <span className="min-w-6 text-center text-xs font-bold tabular-nums" style={{ color: "#3D1018" }}>{inCartQty}</span>
              <button onClick={handleIncrement} className="grid h-7 w-7 place-items-center rounded-full transition" style={{ background: "#641C27" }} aria-label="Increase">
                <Plus style={{ width: 12, height: 12, color: "#E5B84B" }} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={!item.inStock}
              className="rounded-full px-5 py-1.5 text-xs font-bold uppercase tracking-wide transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: item.inStock ? "#641C27" : "#999", color: "#FFF8E8", border: item.inStock ? "1px solid #D4A83E" : "1px solid #ccc" }}
              aria-label={item.inStock ? `Add ${item.name} to cart` : `${item.name} is out of stock`}
            >
              {item.inStock ? "Add" : "Out of Stock"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
