import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const getCachedCoupons = unstable_cache(
  async () => db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
  ["admin-coupons-v1"],
  { revalidate: 10, tags: ["admin-coupons"] }
);

function bustCouponsCache() {
  try { revalidateTag("admin-coupons"); } catch {}
}

// List all coupons (admin)
export async function GET(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coupons = await getCachedCoupons();
  return NextResponse.json({ coupons });
}

// Create or update a coupon
export async function POST(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  if (body.action === "create") {
    const coupon = await db.coupon.create({
      data: {
        code: String(body.code).toUpperCase().trim(),
        description: body.description,
        discountType: body.discountType || "percent",
        discountValue: Number(body.discountValue || 0),
        minOrder: Number(body.minOrder || 0),
        categorySlug: body.categorySlug || null,
        active: body.active ?? true,
        maxRedemptions: Number(body.maxRedemptions || 0),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });
    bustCouponsCache();
    return NextResponse.json({ ok: true, coupon });
  }

  if (body.action === "update") {
    const data: any = {};
    if (body.code !== undefined) data.code = String(body.code).toUpperCase().trim();
    if (body.description !== undefined) data.description = body.description;
    if (body.discountType !== undefined) data.discountType = body.discountType;
    if (body.discountValue !== undefined) data.discountValue = Number(body.discountValue);
    if (body.minOrder !== undefined) data.minOrder = Number(body.minOrder);
    if (body.categorySlug !== undefined) data.categorySlug = body.categorySlug || null;
    if (body.active !== undefined) data.active = !!body.active;
    if (body.maxRedemptions !== undefined) data.maxRedemptions = Number(body.maxRedemptions);
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    const coupon = await db.coupon.update({ where: { id: body.id }, data });
    bustCouponsCache();
    return NextResponse.json({ ok: true, coupon });
  }

  if (body.action === "delete") {
    await db.coupon.delete({ where: { id: body.id } });
    bustCouponsCache();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "toggle") {
    const c = await db.coupon.findUnique({ where: { id: body.id } });
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await db.coupon.update({ where: { id: body.id }, data: { active: !c.active } });
    bustCouponsCache();
    return NextResponse.json({ ok: true, coupon: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
