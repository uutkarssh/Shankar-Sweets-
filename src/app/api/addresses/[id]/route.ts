import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { haversineKm, BUSINESS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// PATCH: update address
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: any = {};
    for (const k of ["label", "houseFlat", "streetArea", "landmark", "city", "pincode"]) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    if (body.lat != null) data.lat = Number(body.lat);
    if (body.lng != null) data.lng = Number(body.lng);
    if (body.lat != null && body.lng != null) {
      data.distanceKm = haversineKm(BUSINESS.lat, BUSINESS.lng, Number(body.lat), Number(body.lng));
    }
    if (body.isDefault === true) {
      const addr = await db.address.findUnique({ where: { id } });
      if (addr) {
        await db.address.updateMany({ where: { phone: addr.phone }, data: { isDefault: false } });
      }
      data.isDefault = true;
    }
    const address = await db.address.update({ where: { id }, data });
    return NextResponse.json({ ok: true, address });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

// DELETE: remove address
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.address.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
