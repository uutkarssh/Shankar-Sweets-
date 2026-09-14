import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: return active delivery zones + max radius + offers enabled (public)
export async function GET() {
  const zones = await db.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const config = await db.restaurantConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    zones: zones.map(z => ({
      id: z.id,
      name: z.name,
      minDistanceKm: z.minDistanceKm,
      maxDistanceKm: z.maxDistanceKm,
      minOrderValue: z.minOrderValue,
      deliveryFee: z.deliveryFee,
      gradientStartFee: z.gradientStartFee,
      gradientEndFee: z.gradientEndFee,
    })),
    maxRadiusKm: config?.deliveryRadiusKm ?? 7,
    offersEnabled: config?.offersEnabled ?? true,
  });
}
