import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await db.restaurantConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ config });
}

export async function PATCH(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const allowed = ["acceptingOrders", "openingTime", "closingTime", "deliveryRadiusKm", "freeDeliveryThreshold", "minDeliveryFee", "maxDeliveryFee", "upiId", "name", "tagline", "address", "phone1", "phone2", "lat", "lng"];
  const data: any = {};
  for (const k of allowed) {
    if (body[k] !== undefined) {
      if (["acceptingOrders"].includes(k)) data[k] = !!body[k];
      else if (["deliveryRadiusKm","freeDeliveryThreshold","minDeliveryFee","maxDeliveryFee","lat","lng"].includes(k)) data[k] = Number(body[k]);
      else data[k] = body[k];
    }
  }
  const config = await db.restaurantConfig.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  return NextResponse.json({ ok: true, config });
}
