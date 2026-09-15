import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET — list all combos (including inactive) for the admin panel.
// Hydrates itemIds with live item data so the admin can see item names/prices.
export async function GET(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const combos = await db.combo.findMany({ orderBy: { sortOrder: "asc" } });

  // Hydrate item references in a single query
  const allItemIds = Array.from(
    new Set(combos.flatMap((c) => {
      try { return JSON.parse(c.itemIds) as string[]; } catch { return []; }
    }))
  );
  const items = allItemIds.length > 0
    ? await db.item.findMany({ where: { id: { in: allItemIds } }, select: { id: true, name: true, price: true, priceSmall: true, priceFull: true, variantType: true, active: true } })
    : [];
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const hydrated = combos.map((c) => {
    let ids: string[] = [];
    try { ids = JSON.parse(c.itemIds) as string[]; } catch {}
    return {
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      comboPrice: c.comboPrice,
      active: c.active,
      sortOrder: c.sortOrder,
      createdAt: c.createdAt,
      items: ids.map((id) => {
        const it = itemMap.get(id);
        if (!it) return { itemId: id, name: "[deleted item]", price: 0, active: false };
        // Pick the right price field based on variantType (matches homepage logic)
        let price = it.price;
        if (it.variantType === "size" && it.priceSmall && it.priceSmall > 0) {
          price = it.priceSmall;
        } else if (it.variantType === "portion" && it.priceFull && it.priceFull > 0) {
          price = it.priceFull;
        }
        return { itemId: id, name: it.name, price, active: it.active };
      }),
    };
  });

  return NextResponse.json({ combos: hydrated });
}

// POST — multi-action: create / update / delete / toggle / reorder
export async function POST(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = body.action as string;

  try {
    if (action === "create") {
      // Required: title, comboPrice, itemIds (array of strings)
      const title = String(body.title || "").trim();
      const subtitle = body.subtitle ? String(body.subtitle).trim() : null;
      const comboPrice = Number(body.comboPrice);
      const itemIds: string[] = Array.isArray(body.itemIds) ? body.itemIds.filter((x: any) => typeof x === "string" && x) : [];

      if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
      if (!Number.isFinite(comboPrice) || comboPrice < 0) return NextResponse.json({ error: "comboPrice must be a non-negative number" }, { status: 400 });
      if (itemIds.length === 0) return NextResponse.json({ error: "At least one item is required" }, { status: 400 });

      // Validate item IDs exist
      const existing = await db.item.findMany({ where: { id: { in: itemIds } }, select: { id: true } });
      if (existing.length !== itemIds.length) {
        const missing = itemIds.filter((id) => !existing.some((e) => e.id === id));
        return NextResponse.json({ error: `Item(s) not found: ${missing.join(", ")}` }, { status: 400 });
      }

      const maxOrder = await db.combo.aggregate({ _max: { sortOrder: true } });
      const sortOrder = body.sortOrder != null ? Number(body.sortOrder) : (maxOrder._max.sortOrder ?? -1) + 1;

      const combo = await db.combo.create({
        data: {
          title,
          subtitle,
          comboPrice,
          itemIds: JSON.stringify(itemIds),
          active: body.active !== false,
          sortOrder,
        },
      });
      return NextResponse.json({ ok: true, combo });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

      const data: any = {};
      if (body.title !== undefined) data.title = String(body.title).trim();
      if (body.subtitle !== undefined) data.subtitle = body.subtitle ? String(body.subtitle).trim() : null;
      if (body.comboPrice !== undefined) {
        const p = Number(body.comboPrice);
        if (!Number.isFinite(p) || p < 0) return NextResponse.json({ error: "comboPrice must be a non-negative number" }, { status: 400 });
        data.comboPrice = p;
      }
      if (body.itemIds !== undefined) {
        const ids: string[] = Array.isArray(body.itemIds) ? body.itemIds.filter((x: any) => typeof x === "string" && x) : [];
        if (ids.length === 0) return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
        // Validate item IDs exist
        const existing = await db.item.findMany({ where: { id: { in: ids } }, select: { id: true } });
        if (existing.length !== ids.length) {
          const missing = ids.filter((id2) => !existing.some((e) => e.id === id2));
          return NextResponse.json({ error: `Item(s) not found: ${missing.join(", ")}` }, { status: 400 });
        }
        data.itemIds = JSON.stringify(ids);
      }
      if (body.active !== undefined) data.active = Boolean(body.active);
      if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);

      const combo = await db.combo.update({ where: { id }, data });
      return NextResponse.json({ ok: true, combo });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
      await db.combo.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    if (action === "toggle") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
      const existing = await db.combo.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: "Combo not found" }, { status: 404 });
      const combo = await db.combo.update({ where: { id }, data: { active: !existing.active } });
      return NextResponse.json({ ok: true, combo });
    }

    if (action === "reorder") {
      // body.order = [{id, sortOrder}, ...]
      const order: Array<{ id: string; sortOrder: number }> = Array.isArray(body.order) ? body.order : [];
      for (const o of order) {
        await db.combo.update({ where: { id: o.id }, data: { sortOrder: Number(o.sortOrder) } });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("[/api/admin/combos] error:", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
