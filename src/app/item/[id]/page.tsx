import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { ItemDetail } from "@/components/site/item-detail";
import type { ProductItem } from "@/components/site/product-card";

export const revalidate = 60; // Cache for 60 seconds — item data rarely changes

// Cache item + related items at the data layer. Even though `params` forces
// the page route to be dynamic, this avoids hitting Turso on every request.
const getCachedItemData = (id: string) =>
  unstable_cache(
    async () => {
      const item = await db.item.findUnique({ where: { id }, include: { category: true } });
      if (!item) return null;
      const related = await db.item.findMany({
        where: { categoryId: item.categoryId, active: true, id: { not: item.id } },
        take: 6,
        orderBy: { sortOrder: "asc" },
      });
      return { item, related };
    },
    [`item-data-v1-${id}`],
    { revalidate: 60, tags: ["menu"] }
  )();

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCachedItemData(id);
  if (!data) notFound();
  const { item, related } = data;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      {/* Header returns null on item detail pages — hero image has its own back button */}
      <Header />
      <main className="flex-1 pb-4">
        <ItemDetail item={item as ProductItem} relatedItems={related as ProductItem[]} />
      </main>
      <BottomNav />
    </div>
  );
}
