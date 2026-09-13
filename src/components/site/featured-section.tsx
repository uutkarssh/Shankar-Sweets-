"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProductCard, type ProductItem } from "./product-card";

export function SectionHeading({
  title,
  onSeeAll,
  seeAllHref,
}: {
  title: string;
  onSeeAll?: () => void;
  seeAllHref?: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-2">
        <span className="h-4 w-1 rounded-full" style={{ background: "#D4A83E" }} />
        <h2
          className="text-lg font-semibold leading-tight sm:text-xl"
          style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}
        >
          {title}
        </h2>
      </div>
      {(onSeeAll || seeAllHref) && (
        <button
          onClick={() => (onSeeAll ? onSeeAll() : seeAllHref && router.push(seeAllHref))}
          className="flex items-center gap-0.5 text-xs font-semibold transition hover:gap-1.5"
          style={{ color: "#641C27", fontFamily: "var(--font-outfit)" }}
        >
          See all
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      )}
    </div>
  );
}

export function FeaturedSection({
  title,
  items,
  onSeeAll,
  seeAllHref,
}: {
  title: string;
  items: ProductItem[];
  onSeeAll?: () => void;
  seeAllHref?: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
      <SectionHeading title={title} onSeeAll={onSeeAll} seeAllHref={seeAllHref} />
      <div className="gold-divider mt-2 mb-4">
        <svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden>
          <path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((it, i) => (
          <div key={it.id} className="animate-card-pop" style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}>
            <ProductCard item={it} />
          </div>
        ))}
      </div>
    </section>
  );
}
