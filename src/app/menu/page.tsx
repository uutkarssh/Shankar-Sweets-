import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { Header } from "@/components/site/header";
import { SearchBar } from "@/components/site/search-bar";
import { CategoryRow, type Category } from "@/components/site/category-row";
import { ProductCard, type ProductItem } from "@/components/site/product-card";
import { BottomNav } from "@/components/site/bottom-nav";
import { SectionHeading } from "@/components/site/featured-section";

export const revalidate = 60; // Cache for 60 seconds — menu data rarely changes

// Cache the full menu (all active categories + all active items) at the
// data layer. Even though `searchParams` forces the page route to be
// dynamic, this avoids hitting Turso on every request — the cached data
// is reused across all menu page variants (default, ?cat=, ?q=).
const getCachedMenuData = unstable_cache(
  async () => {
    const [categories, allItems] = await Promise.all([
      db.category.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      }),
      db.item.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: { category: true },
      }),
    ]);
    return { categories, allItems };
  },
  ["menu-data-v1"],
  { revalidate: 60, tags: ["menu"] }
);

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const catSlug = sp.cat;

  // Fetch all categories + items from the cached data layer, then filter
  // in JS. This avoids hitting the DB on every request.
  const { categories, allItems } = await getCachedMenuData();

  // Filter items in JS based on search params
  let items = allItems;
  if (catSlug) {
    items = items.filter((i: any) => i.category?.slug === catSlug);
  }
  if (q) {
    const ql = q.toLowerCase();
    items = items.filter((i: any) => i.name.toLowerCase().includes(ql));
  }

  // Group items by category only when no search query; search uses a flat grid.
  // Previously this used an N+1 pattern: 1 query for categories + 9 separate
  // queries (one per category) for items = 10 DB round-trips. Now we fetch
  // all active items in a single cached query and group them in JS.
  let grouped: { category: any; items: any[] }[] | null = null;
  if (!catSlug && !q) {
    grouped = categories
      .map((c: any) => ({
        category: c,
        items: allItems.filter((i: any) => i.categoryId === c.id),
      }))
      .sort((a: any, b: any) => {
        // Categories with items first (sorted by count desc), then empty ones
        if (a.items.length === 0 && b.items.length > 0) return 1;
        if (a.items.length > 0 && b.items.length === 0) return -1;
        if (a.items.length !== b.items.length) return b.items.length - a.items.length;
        // If same count, keep original sortOrder
        return a.category.sortOrder - b.category.sortOrder;
      });
  }

  const activeCat = catSlug ? categories.find((c: any) => c.slug === catSlug) : undefined;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <SearchBar initial={q ?? ""} />

      <main className="flex-1 pb-safe-cart">
        <CategoryRow categories={categories as Category[]} activeSlug={catSlug} sticky />

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
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 items-stretch">
                    {items.map((it) => (
                      <div key={it.id} className="flex h-full">
                        <ProductCard item={it as ProductItem} />
                      </div>
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
          <div className="mx-auto mt-4 grid max-w-6xl grid-cols-2 gap-3 px-3 sm:grid-cols-3 sm:gap-4 sm:px-4 lg:grid-cols-4 items-stretch">
            {items.map((it) => (
              <div key={it.id} className="flex h-full">
                <ProductCard item={it as ProductItem} />
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
