import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { ItemDetail } from "@/components/site/item-detail";
import type { ProductItem } from "@/components/site/product-card";

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.item.findUnique({ where: { id }, include: { category: true } });
  if (!item) notFound();

  const related = await db.item.findMany({
    where: { categoryId: item.categoryId, active: true, id: { not: item.id } },
    take: 6,
    orderBy: { sortOrder: "asc" },
  });

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
