import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await db.restaurantConfig.findUnique({ where: { id: "singleton" } });
  // Don't leak secrets — only public fields
  return NextResponse.json({
    acceptingOrders: config?.acceptingOrders ?? true,
    openingTime: config?.openingTime ?? "08:00",
    closingTime: config?.closingTime ?? "22:00",
    deliveryRadiusKm: config?.deliveryRadiusKm ?? 5,
    freeDeliveryThreshold: config?.freeDeliveryThreshold ?? 300,
    minDeliveryFee: config?.minDeliveryFee ?? 10,
    maxDeliveryFee: config?.maxDeliveryFee ?? 70,
  });
}
