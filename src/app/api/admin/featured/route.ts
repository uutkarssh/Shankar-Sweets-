import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// Reorder featured items (drag-and-drop)
export async function POST(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { order } = await req.json(); // [{id, featuredOrder}]
  for (const o of order) {
    await db.item.update({ where: { id: o.id }, data: { featured: true, featuredOrder: Number(o.featuredOrder) } });
  }
  return NextResponse.json({ ok: true });
}
