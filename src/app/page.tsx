import { db } from "@/lib/db";
import { Header } from "@/components/site/header";
import { SearchBar } from "@/components/site/search-bar";
import { CategoryRow, type Category } from "@/components/site/category-row";
import { PromoBanner } from "@/components/site/promo-banner";
import { FeaturedSection } from "@/components/site/featured-section";
import { BottomNav } from "@/components/site/bottom-nav";
import { BUSINESS } from "@/lib/constants";
import { MapPin, Phone, Clock, Truck, Award, Leaf, HeartHandshake, Sparkles } from "lucide-react";

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

        {/* Heritage banner */}
        <HeritageBanner />

        {/* Why choose us */}
        <WhyChooseUs />

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

function HeritageBanner() {
  const years = new Date().getFullYear() - BUSINESS.sinceYear;
  return (
    <section className="mx-auto mt-6 max-w-6xl px-3 sm:px-4">
      <div className="ornate-frame relative overflow-hidden rounded-3xl px-6 py-8 text-center" style={{ background: "linear-gradient(135deg, #641C27 0%, #3D1018 100%)", color: "#FFF8E8" }}>
        <div className="gold-divider mb-4 mx-auto max-w-sm">
          <Sparkles style={{ width: 18, height: 18, color: "#E5B84B" }} />
        </div>
        <div className="text-4xl font-extrabold sm:text-5xl" style={{ fontFamily: "var(--font-poppins)", color: "#E5B84B" }}>
          {years}+ Years
        </div>
        <h3 className="mt-2 text-lg font-bold sm:text-xl" style={{ fontFamily: "var(--font-poppins)" }}>
          Serving Baraut with Love Since {BUSINESS.sinceYear}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed sm:text-sm" style={{ color: "rgba(255,248,232,0.8)" }}>
          Three generations of authentic recipes, handcrafted sweets, and freshly baked goodness.
          Every bite carries the warmth of our six-decade legacy.
        </p>
      </div>
    </section>
  );
}

function WhyChooseUs() {
  const features = [
    { icon: Award, title: "Authentic Recipes", desc: "Time-honoured methods passed down since 1962" },
    { icon: Leaf, title: "Pure & Fresh", desc: "Made daily with quality ingredients" },
    { icon: Truck, title: "Fast Delivery", desc: `Free above ₹${BUSINESS.freeDeliveryThreshold}, within ${BUSINESS.deliveryRadiusKm} km` },
    { icon: HeartHandshake, title: "Trusted by Generations", desc: "Baraut's favourite sweet shop for decades" },
  ];
  return (
    <section className="mx-auto mt-6 max-w-6xl px-3 sm:px-4">
      <div className="flex items-center gap-2 px-1 mb-4">
        <span className="h-4 w-1 rounded-full" style={{ background: "#D4A83E" }} />
        <h2 className="text-lg font-semibold sm:text-xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>
          Why Shankar?
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="animate-fade-in-up rounded-2xl border p-4 text-center"
              style={{ borderColor: "#E8D9B8", background: "#FFFFFF", animationDelay: `${i * 80}ms` }}
            >
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-full" style={{ background: "#641C27" }}>
                <Icon style={{ width: 20, height: 20, color: "#E5B84B" }} />
              </div>
              <h3 className="mt-2 text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{f.title}</h3>
              <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "#76544A" }}>{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
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
