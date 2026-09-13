import { db } from "@/lib/db";
import { Header } from "@/components/site/header";
import { SearchBar } from "@/components/site/search-bar";
import { CategoryRow, type Category } from "@/components/site/category-row";
import { PromoBanner } from "@/components/site/promo-banner";
import { FeaturedSection } from "@/components/site/featured-section";
import { BottomNav } from "@/components/site/bottom-nav";
import { BUSINESS } from "@/lib/constants";
import { MapPin, Phone, Clock, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  const featured = await db.item.findMany({
    where: { featured: true, active: true, inStock: true },
    orderBy: { sortOrder: "asc" },
    take: 8,
  });

  const bestSellers = await db.item.findMany({
    where: { bestSeller: true, active: true },
    orderBy: { rating: "desc" },
    take: 4,
  });

  const chaatItems = await db.item.findMany({
    where: { category: { slug: "chaat" }, active: true },
    orderBy: { sortOrder: "asc" },
    take: 4,
  });

  const config = await db.restaurantConfig.findUnique({ where: { id: "singleton" } });

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <SearchBar />

      <main className="flex-1 pb-24">
        <CategoryRow categories={categories as Category[]} />

        <PromoBanner />

        {/* Info strip */}
        <div className="mx-auto mt-4 max-w-6xl px-3 sm:px-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto rounded-2xl border px-3 py-2 no-scrollbar" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <InfoChip icon={Clock} label="Open" value={`${BUSINESS.openingTime}–${BUSINESS.closingTime}`} />
            <InfoChip icon={Truck} label="Free Delivery" value="Above ₹300" />
            <InfoChip icon={MapPin} label="Delivery" value="Within 5 km" />
            <InfoChip icon={Phone} label="Call" value={BUSINESS.phones[0]} />
          </div>
        </div>

        {/* Accepting orders banner */}
        {config?.acceptingOrders === false && (
          <div className="mx-auto mt-3 max-w-6xl px-3 sm:px-4">
            <div className="rounded-2xl px-4 py-3 text-center" style={{ background: "#F5E8CF", color: "#641C27" }}>
              <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-poppins)" }}>
                We'll be open soon
              </p>
              <p className="text-xs" style={{ color: "#76544A" }}>
                Online ordering is temporarily paused. Please check back shortly.
              </p>
            </div>
          </div>
        )}

        {featured.length > 0 && (
          <FeaturedSection title="Featured Items" items={featured as any} seeAllHref="/menu" />
        )}

        {bestSellers.length > 0 && (
          <FeaturedSection title="Best Sellers" items={bestSellers as any} seeAllHref="/menu" />
        )}

        {chaatItems.length > 0 && (
          <FeaturedSection title="Chaat Corner" items={chaatItems as any} seeAllHref="/menu?cat=chaat" />
        )}

        {/* Footer */}
        <Footer />
      </main>

      <BottomNav />
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 px-1">
      <Icon style={{ width: 16, height: 16, color: "#D4A83E" }} />
      <div className="leading-tight">
        <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#76544A", fontFamily: "var(--font-outfit)" }}>
          {label}
        </div>
        <div className="text-xs font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mx-auto mt-6 w-full max-w-6xl px-3 sm:px-4">
      <div className="rounded-3xl px-5 py-6 text-center" style={{ background: "#641C27", color: "#FFF8E8" }}>
        <div className="gold-divider mb-3 mx-auto max-w-xs">
          <svg width="24" height="10" viewBox="0 0 24 10" fill="none" aria-hidden>
            <path d="M12 0 L15 5 L12 10 L9 5 Z" fill="#D4A83E" />
          </svg>
        </div>
        <h3 className="text-base font-bold tracking-wide" style={{ fontFamily: "var(--font-poppins)" }}>
          {BUSINESS.name}
        </h3>
        <p className="mt-0.5 text-[11px] italic" style={{ color: "#E5B84B" }}>
          {BUSINESS.tagline} • Since {BUSINESS.sinceYear}
        </p>
        <p className="mx-auto mt-3 max-w-sm text-[11px] leading-relaxed" style={{ color: "rgba(255,248,232,0.8)" }}>
          {BUSINESS.address}
        </p>
        <div className="mt-2 flex items-center justify-center gap-3 text-[11px]">
          {BUSINESS.phones.map((p) => (
            <a key={p} href={`tel:${p}`} className="flex items-center gap-1 transition hover:text-[#E5B84B]" style={{ color: "#FFF8E8" }}>
              <Phone style={{ width: 12, height: 12 }} />
              {p}
            </a>
          ))}
        </div>
        <div className="mt-3 text-[10px]" style={{ color: "rgba(255,248,232,0.5)" }}>
          Sweets • Bakery • Ice Cream • Chaat • Pizza • Burger • Maggie • Chinese
        </div>
      </div>
    </footer>
  );
}
