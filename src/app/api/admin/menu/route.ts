import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { deleteMenuImage, deleteMenuImages } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Cache the full menu (categories + items, including inactive) for 10 seconds.
// Admin pages poll this every 15-20s, so a 10s cache still shows fresh data
// while cutting response time from ~400ms to ~15ms.
const getCachedAdminMenu = unstable_cache(
  async () => {
    const categories = await db.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    return categories;
  },
  ["admin-menu-v1"],
  { revalidate: 10, tags: ["admin-menu"] }
);

export async function GET() {
  const categories = await getCachedAdminMenu();
  return NextResponse.json({ categories });
}

// Helper: bust the admin menu cache + the public menu cache after any mutation
function bustMenuCache() {
  try { revalidateTag("admin-menu"); } catch {}
  try { revalidateTag("menu"); } catch {}
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
        pricePer250: body.pricePer250 ? Number(body.pricePer250) : null,
        pricePer500: body.pricePer500 ? Number(body.pricePer500) : null,
        pricePerKg: body.pricePerKg ? Number(body.pricePerKg) : null,
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
    bustMenuCache();
    return NextResponse.json({ ok: true, item });
  }

  if (body.action === "update-item") {
    // Fetch the existing item to get old image URLs for cleanup
    const existing = await db.item.findUnique({ where: { id: body.id }, select: { image: true, images: true } });

    const data: any = {};
    for (const k of ["name", "description", "categoryId", "price", "priceSmall", "priceLarge", "priceHalf", "priceFull", "pricePer250", "pricePer500", "pricePerKg", "variantType", "image", "veg", "inStock", "featured", "bestSeller", "sortOrder"]) {
      if (body[k] !== undefined) data[k] = body[k] === null ? null : (typeof body[k] === "number" || ["price","priceSmall","priceLarge","priceHalf","priceFull","pricePer250","pricePer500","pricePerKg","sortOrder"].includes(k) ? Number(body[k]) : body[k]);
    }
    if (body.weightBased !== undefined) data.weightBased = !!body.weightBased;
    if (body.images !== undefined) data.images = body.images ? JSON.stringify(body.images) : null;

    const item = await db.item.update({ where: { id: body.id }, data });

    // === CLEAN UP OLD IMAGES FROM SUPABASE ===
    // This prevents junk from building up when images are replaced.

    // 1. Main image changed? Delete the old one.
    if (body.image !== undefined && existing?.image && existing.image !== body.image) {
      await deleteMenuImage(existing.image);
    }

    // 2. Gallery images changed? Delete any that were removed.
    if (body.images !== undefined && existing?.images) {
      let oldGalleryUrls: string[] = [];
      try {
        const parsed = JSON.parse(existing.images);
        if (Array.isArray(parsed)) oldGalleryUrls = parsed.filter(Boolean);
      } catch {}

      let newGalleryUrls: string[] = [];
      if (body.images && Array.isArray(body.images)) {
        newGalleryUrls = body.images.filter(Boolean);
      }

      // Find URLs that were in the old gallery but not in the new one
      const removedUrls = oldGalleryUrls.filter(url => !newGalleryUrls.includes(url));
      if (removedUrls.length > 0) {
        await deleteMenuImages(removedUrls);
      }
    }

    bustMenuCache();
    return NextResponse.json({ ok: true, item });
  }

  if (body.action === "delete-item") {
    // Fetch images before deleting so we can clean up Supabase
    const item = await db.item.findUnique({ where: { id: body.id }, select: { image: true, images: true } });

    await db.item.delete({ where: { id: body.id } });

    // Delete the item's main image + gallery images from Supabase
    if (item) {
      let allUrls: (string | null)[] = [item.image];
      if (item.images) {
        try {
          const parsed = JSON.parse(item.images);
          if (Array.isArray(parsed)) allUrls.push(...parsed);
        } catch {}
      }
      await deleteMenuImages(allUrls);
    }

    bustMenuCache();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "create-category") {
    const cat = await db.category.create({ data: { name: body.name, slug: body.slug || body.name.toLowerCase().replace(/\s+/g, "-"), icon: body.icon || null, sortOrder: Number(body.sortOrder || 0) } });
    bustMenuCache();
    return NextResponse.json({ ok: true, category: cat });
  }

  if (body.action === "update-category") {
    // Fetch old icon for cleanup
    const existing = await db.category.findUnique({ where: { id: body.id }, select: { icon: true } });

    const cat = await db.category.update({ where: { id: body.id }, data: { name: body.name, icon: body.icon, sortOrder: Number(body.sortOrder), active: !!body.active } });

    // Delete old icon from Supabase if it was changed
    if (body.icon !== undefined && existing?.icon && existing.icon !== body.icon) {
      await deleteMenuImage(existing.icon);
    }

    bustMenuCache();
    return NextResponse.json({ ok: true, category: cat });
  }

  if (body.action === "delete-category") {
    // Fetch icon before deleting for cleanup
    const cat = await db.category.findUnique({ where: { id: body.id }, select: { icon: true } });

    await db.category.delete({ where: { id: body.id } });

    // Delete the category's icon from Supabase
    if (cat?.icon) {
      await deleteMenuImage(cat.icon);
    }

    bustMenuCache();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
