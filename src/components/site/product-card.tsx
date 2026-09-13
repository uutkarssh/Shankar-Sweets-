"use client";

import { Heart, Plus, Star } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/store";
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
  rating: number;
  ratingCount: number;
  bestSeller: boolean;
  veg: boolean;
  inStock: boolean;
};

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
        { label: "250g", price: item.pricePer250 ?? item.price },
        { label: "500g", price: item.pricePer500 ?? item.price },
        { label: "1kg", price: item.pricePerKg ?? item.price },
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
  const [wishlist, setWishlist] = useState(false);
  const variants = getVariants(item);
  const [variant, setVariant] = useState<VariantOption>(variants[0]);

  const handleAdd = () => {
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
    toast.success(`${item.name} added`, { description: `${variant.label} — ${formatINR(variant.price)}` });
  };

  return (
    <div className="product-card flex flex-col">
      {/* Image with fully rounded corners */}
      <div className="relative p-2.5">
        <button
          onClick={() => router.push(`/item/${item.id}`)}
          className="relative block aspect-square w-full overflow-hidden rounded-2xl"
          style={{ background: "#F5E8CF" }}
          aria-label={`View ${item.name}`}
        >
          {item.image ? (
             
            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
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
          onClick={() => setWishlist((w) => !w)}
          className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-white shadow-md transition hover:scale-110"
          aria-label="Add to wishlist"
        >
          <Heart
            style={{ width: 14, height: 14 }}
            className={wishlist ? "fill-red-500 text-red-500" : "text-[#76544A]"}
          />
        </button>

        {/* Rating badge bottom-left */}
        <div
          className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow"
          style={{ background: "#3D1018" }}
        >
          <Star className="fill-current" style={{ width: 10, height: 10, color: "#E5B84B" }} />
          {item.rating.toFixed(1)}
        </div>

        {/* Best seller badge */}
        {item.bestSeller && (
          <div
            className="absolute bottom-4 right-4 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow"
            style={{ background: "linear-gradient(90deg, #D4A83E, #E5B84B)", color: "#3D1018" }}
          >
            Best Seller
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-3 pb-3">
        <h3
          className="line-clamp-1 text-sm font-semibold leading-tight"
          style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}
        >
          {item.name}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-[11px]" style={{ color: "#76544A" }}>
          {item.description || "Delicious and freshly prepared."}
        </p>

        {/* Variant selector */}
        {variants.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {variants.map((v) => (
              <button
                key={v.label}
                onClick={() => setVariant(v)}
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

        {/* Price + add */}
        <div className="mt-auto flex items-center justify-between pt-2.5">
          <div>
            <div className="text-base font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
              {formatINR(variant.price)}
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!item.inStock}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition hover:scale-105 disabled:opacity-50"
            style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E", fontFamily: "var(--font-outfit)" }}
            aria-label={`Add ${item.name} to cart`}
          >
            <Plus style={{ width: 12, height: 12, color: "#E5B84B" }} />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
