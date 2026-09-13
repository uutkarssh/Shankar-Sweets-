import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { ItemDetail } from "@/components/site/item-detail";
import { ReviewsSection } from "@/components/site/reviews-section";
import type { ProductItem } from "@/components/site/product-card";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.item.findUnique({ where: { id }, include: { category: true } });
  if (!item) notFound();

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-4">
        <div className="mx-auto max-w-3xl px-3 pt-3 sm:px-4">
          <Link href="/menu" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "#641C27" }}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Back to menu
          </Link>
        </div>
        <ItemDetail item={item as ProductItem} />
        <div className="mx-auto max-w-3xl px-3 pb-8 sm:px-4">
          <ReviewsSection itemId={item.id} itemName={item.name} />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
