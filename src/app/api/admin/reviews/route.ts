import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// List all reviews (admin moderation)
export async function GET(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const itemId = url.searchParams.get("itemId");
  const reviews = await db.review.findMany({
    where: itemId ? { itemId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { item: { select: { name: true } } },
  });
  return NextResponse.json({ reviews });
}

// Toggle active (hide/show) or delete
export async function PATCH(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reviewId, action } = await req.json();
  if (action === "hide") {
    await db.review.update({ where: { id: reviewId }, data: { active: false } });
  } else if (action === "show") {
    await db.review.update({ where: { id: reviewId }, data: { active: true } });
  } else if (action === "delete") {
    await db.review.delete({ where: { id: reviewId } });
  }
  return NextResponse.json({ ok: true });
}
