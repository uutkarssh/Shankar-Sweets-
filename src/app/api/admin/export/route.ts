import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function csvEscape(val: any): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "orders";

  if (type === "orders") {
    const orders = await db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const headers = ["Order Number", "Date", "Customer", "Phone", "Address", "PIN", "Distance(km)", "Items", "Subtotal", "Discount", "Delivery Fee", "Total", "Payment Method", "Payment Status", "Status"];
    const rows = orders.map((o) => {
      let itemCount = 0;
      try {
        const items = JSON.parse(o.items);
        itemCount = Array.isArray(items) ? items.reduce((s: number, it: any) => s + (it.qty || 1), 0) : 0;
      } catch {}
      return [
        o.orderNumber,
        new Date(o.createdAt).toLocaleString("en-IN"),
        o.customerName,
        o.customerPhone,
        o.address,
        o.pincode,
        o.distanceKm?.toFixed(2) || "",
        itemCount,
        o.subtotal,
        o.discount,
        o.deliveryFee,
        o.total,
        o.paymentMethod,
        o.paymentStatus,
        o.status,
      ].map(csvEscape).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (type === "menu") {
    const items = await db.item.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });

    const headers = ["Name", "Category", "Base Price", "Variant Type", "Small", "Large", "Half", "Full", "Featured", "Best Seller", "Veg", "In Stock", "Rating", "Rating Count"];
    const rows = items.map((it) => [
      it.name,
      it.category.name,
      it.price,
      it.variantType,
      it.priceSmall || "",
      it.priceLarge || "",
      it.priceHalf || "",
      it.priceFull || "",
      it.featured ? "Yes" : "No",
      it.bestSeller ? "Yes" : "No",
      it.veg ? "Yes" : "No",
      it.inStock ? "Yes" : "No",
      it.rating,
      it.ratingCount,
    ].map(csvEscape).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="menu-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
}
