import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { haversineKm, BUSINESS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// GET: list addresses for a phone
export async function GET(req: Request) {
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone")?.trim();
  if (!phone) return NextResponse.json({ addresses: [] });

  const addresses = await db.address.findMany({
    where: { phone },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ addresses });
}

// POST: create a new address
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, label, houseFlat, streetArea, landmark, city, pincode, lat, lng, isDefault } = body;

    if (!phone || !houseFlat || !streetArea || !pincode || lat == null || lng == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (pincode.length !== 6) {
      return NextResponse.json({ error: "PIN must be 6 digits" }, { status: 400 });
    }

    // Compute distance
    const distanceKm = haversineKm(BUSINESS.lat, BUSINESS.lng, Number(lat), Number(lng));

    // If this is the first address or isDefault is true, unset others
    const count = await db.address.count({ where: { phone } });
    const makeDefault = isDefault || count === 0;
    if (makeDefault) {
      await db.address.updateMany({ where: { phone }, data: { isDefault: false } });
    }

    const address = await db.address.create({
      data: {
        phone,
        label: label || (count === 0 ? "Home" : "Other"),
        houseFlat,
        streetArea,
        landmark: landmark || null,
        city: city || "Prayagraj",
        pincode,
        lat: Number(lat),
        lng: Number(lng),
        distanceKm,
        isDefault: makeDefault,
      },
    });
    return NextResponse.json({ ok: true, address });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
