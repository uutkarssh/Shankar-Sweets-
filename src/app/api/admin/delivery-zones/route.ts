import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: return active delivery zones + max radius (public, for customer-side calc)
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

// POST: create or update a zone (admin only)
export async function POST(req: Request) {
  const { isAdminAuthed } = await import("@/lib/admin-auth");
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  if (body.action === "create") {
    const zone = await db.deliveryZone.create({
      data: {
        name: body.name,
        minDistanceKm: Number(body.minDistanceKm),
        maxDistanceKm: Number(body.maxDistanceKm),
        minOrderValue: Number(body.minOrderValue || 0),
        deliveryFee: Number(body.deliveryFee || 0),
        gradientStartFee: body.gradientStartFee != null ? Number(body.gradientStartFee) : null,
        gradientEndFee: body.gradientEndFee != null ? Number(body.gradientEndFee) : null,
        isActive: body.isActive ?? true,
        sortOrder: Number(body.sortOrder || 0),
      },
    });
    return NextResponse.json({ ok: true, zone });
  }

  if (body.action === "update") {
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.minDistanceKm !== undefined) data.minDistanceKm = Number(body.minDistanceKm);
    if (body.maxDistanceKm !== undefined) data.maxDistanceKm = Number(body.maxDistanceKm);
    if (body.minOrderValue !== undefined) data.minOrderValue = Number(body.minOrderValue);
    if (body.deliveryFee !== undefined) data.deliveryFee = Number(body.deliveryFee);
    if (body.gradientStartFee !== undefined) data.gradientStartFee = body.gradientStartFee != null ? Number(body.gradientStartFee) : null;
    if (body.gradientEndFee !== undefined) data.gradientEndFee = body.gradientEndFee != null ? Number(body.gradientEndFee) : null;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);
    const zone = await db.deliveryZone.update({ where: { id: body.id }, data });
    return NextResponse.json({ ok: true, zone });
  }

  if (body.action === "delete") {
    await db.deliveryZone.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update-radius") {
    await db.restaurantConfig.update({
      where: { id: "singleton" },
      data: { deliveryRadiusKm: Number(body.radius) },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "toggle-offers") {
    await db.restaurantConfig.update({
      where: { id: "singleton" },
      data: { offersEnabled: !!body.enabled },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
