import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { items: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
  const config = await db.restaurantConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ categories, config });
}
