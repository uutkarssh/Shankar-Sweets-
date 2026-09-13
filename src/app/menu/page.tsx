import { db } from "@/lib/db";
import { Header } from "@/components/site/header";
import { SearchBar } from "@/components/site/search-bar";
import { CategoryRow, type Category } from "@/components/site/category-row";
import { ProductCard, type ProductItem } from "@/components/site/product-card";
import { BottomNav } from "@/components/site/bottom-nav";
import { SectionHeading } from "@/components/site/featured-section";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const catSlug = sp.cat;

  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  const where: any = { active: true };
  if (catSlug) where.category = { slug: catSlug };
  if (q) where.name = { contains: q };

  const items = await db.item.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    include: { category: true },
  });

  // Group items by category only when no search query; search uses a flat grid.
  const grouped = catSlug || q
    ? null
    : await Promise.all(
        categories.map(async (c) => ({
          category: c,
          items: await db.item.findMany({
            where: { categoryId: c.id, active: true },
            orderBy: { sortOrder: "asc" },
          }),
        }))
      );

  const activeCat = catSlug ? categories.find((c) => c.slug === catSlug) : undefined;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <SearchBar initial={q ?? ""} />

      <main className="flex-1 pb-24">
        <CategoryRow categories={categories as Category[]} activeSlug={catSlug} />

        <div className="mx-auto max-w-6xl px-3 pt-1 sm:px-4">
          <div className="flex items-center justify-between">
            <h1
              className="text-xl font-bold sm:text-2xl"
              style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}
            >
              {activeCat ? activeCat.name : q ? `Results for "${q}"` : "Our Menu"}
            </h1>
            <span className="text-xs font-medium" style={{ color: "#76544A" }}>
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="gold-divider mt-2 mb-1">
            <svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden>
              <path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" />
            </svg>
          </div>
        </div>

        {grouped ? (
          <div className="space-y-6 pt-3">
            {grouped.map(({ category, items }) =>
              items.length === 0 ? (
                <section key={category.id} className="mx-auto max-w-6xl px-3 sm:px-4">
                  <SectionHeading title={category.name} />
                  <div className="mt-3 rounded-2xl border border-dashed px-4 py-8 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                    <p className="text-sm font-semibold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
                      Coming Soon
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "#76544A" }}>
                      Our {category.name} selection is being curated. Please check back shortly.
                    </p>
                  </div>
                </section>
              ) : (
                <section key={category.id} className="mx-auto max-w-6xl px-3 sm:px-4">
                  <SectionHeading title={category.name} seeAllHref={undefined} />
                  <div className="gold-divider mt-2 mb-4">
                    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden>
                      <path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" />
                    </svg>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                    {items.map((it) => (
                      <ProductCard key={it.id} item={it as ProductItem} />
                    ))}
                  </div>
                </section>
              )
            )}
          </div>
        ) : items.length === 0 ? (
          <div className="mx-auto mt-8 max-w-md px-4 text-center">
            <p className="text-sm font-semibold" style={{ color: "#641C27" }}>No items found</p>
            <p className="mt-1 text-xs" style={{ color: "#76544A" }}>Try a different search or category.</p>
          </div>
        ) : (
          <div className="mx-auto mt-4 grid max-w-6xl grid-cols-2 gap-3 px-3 sm:grid-cols-3 sm:gap-4 sm:px-4 lg:grid-cols-4">
            {items.map((it) => (
              <ProductCard key={it.id} item={it as ProductItem} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
