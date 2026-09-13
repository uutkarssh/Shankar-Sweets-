import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Create item
  if (body.action === "create-item") {
    const item = await db.item.create({
      data: {
        name: body.name,
        description: body.description || null,
        categoryId: body.categoryId,
        price: Number(body.price),
        priceSmall: body.priceSmall ? Number(body.priceSmall) : null,
        priceLarge: body.priceLarge ? Number(body.priceLarge) : null,
        priceHalf: body.priceHalf ? Number(body.priceHalf) : null,
        priceFull: body.priceFull ? Number(body.priceFull) : null,
        weightBased: !!body.weightBased,
        variantType: body.variantType || "single",
        image: body.image || null,
        images: body.images ? JSON.stringify(body.images) : null,
        veg: body.veg ?? true,
        inStock: body.inStock ?? true,
        featured: !!body.featured,
        bestSeller: !!body.bestSeller,
        sortOrder: Number(body.sortOrder || 0),
      },
    });
    return NextResponse.json({ ok: true, item });
  }

  if (body.action === "update-item") {
    const data: any = {};
    for (const k of ["name", "description", "categoryId", "price", "priceSmall", "priceLarge", "priceHalf", "priceFull", "variantType", "image", "veg", "inStock", "featured", "bestSeller", "sortOrder"]) {
      if (body[k] !== undefined) data[k] = body[k] === null ? null : (typeof body[k] === "number" || ["price","priceSmall","priceLarge","priceHalf","priceFull","sortOrder"].includes(k) ? Number(body[k]) : body[k]);
    }
    if (body.weightBased !== undefined) data.weightBased = !!body.weightBased;
    if (body.images !== undefined) data.images = body.images ? JSON.stringify(body.images) : null;
    const item = await db.item.update({ where: { id: body.id }, data });
    return NextResponse.json({ ok: true, item });
  }

  if (body.action === "delete-item") {
    await db.item.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "create-category") {
    const cat = await db.category.create({ data: { name: body.name, slug: body.slug || body.name.toLowerCase().replace(/\s+/g, "-"), icon: body.icon || null, sortOrder: Number(body.sortOrder || 0) } });
    return NextResponse.json({ ok: true, category: cat });
  }

  if (body.action === "update-category") {
    const cat = await db.category.update({ where: { id: body.id }, data: { name: body.name, icon: body.icon, sortOrder: Number(body.sortOrder), active: !!body.active } });
    return NextResponse.json({ ok: true, category: cat });
  }

  if (body.action === "delete-category") {
    await db.category.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
