import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSupabaseServer, MENU_BUCKET } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel free tier: 60s max for serverless functions

/**
 * Cron job: Clean up old UPI payment screenshots.
 *
 * Runs daily at 3:00 AM UTC (configured in vercel.json).
 *
 * Rules:
 * - Find all orders where paymentScreenshot is NOT NULL
 * - Only clean up orders where paymentStatus is "VERIFIED" or "REJECTED"
 *   (i.e. verification is RESOLVED — don't touch orders still under review)
 * - Only clean up orders older than 3 days (based on createdAt)
 * - For each matching order:
 *   1. If the screenshot is a Supabase Storage URL: delete the file from Storage
 *   2. If the screenshot is a base64 data URL: just null the field (no file to delete)
 *   3. Set paymentScreenshot to NULL in the database
 * - Log how many screenshots were cleaned up
 *
 * Security: This endpoint is protected by a CRON_SECRET environment variable.
 * Vercel automatically sends this as the Authorization header when invoking
 * cron jobs. If CRON_SECRET is not set, the endpoint falls back to checking
 * the x-vercel-cron-auth header that Vercel sets automatically.
 */
export async function GET(req: Request) {
  // ─── Auth: verify this is a legitimate Vercel Cron invocation ───
  const authHeader = req.headers.get("authorization") || "";
  const cronAuthHeader = req.headers.get("x-vercel-cron-auth") || "";
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, require it in the Authorization header
  // (Vercel sends: Authorization: Bearer <CRON_SECRET>)
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    // If no CRON_SECRET is set, only allow requests with the Vercel cron header
    // OR from localhost (for manual testing)
    const isVercelCron = req.headers.get("x-vercel-cron") === "1" || cronAuthHeader;
    const host = req.headers.get("host") || "";
    const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
    if (!isVercelCron && !isLocalhost) {
      return NextResponse.json({ error: "Unauthorized — set CRON_SECRET or run from Vercel Cron" }, { status: 401 });
    }
  }

  console.log("[cleanup-screenshots] Starting scheduled cleanup...");

  // ─── Find orders with screenshots older than 3 days, where payment is resolved ───
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const orders = await db.order.findMany({
    where: {
      paymentScreenshot: { not: null },
      // Only clean up resolved payments — don't touch orders still under review
      paymentStatus: { in: ["VERIFIED", "REJECTED"] },
      createdAt: { lt: threeDaysAgo },
    },
    select: {
      id: true,
      orderNumber: true,
      paymentScreenshot: true,
      paymentStatus: true,
      createdAt: true,
    },
  });

  console.log(`[cleanup-screenshots] Found ${orders.length} orders with screenshots older than 3 days (resolved payments only)`);

  // ─── Process each order ───
  const supabase = getSupabaseServer();
  let cleanedCount = 0;
  let storageDeletedCount = 0;
  let dataUrlClearedCount = 0;
  let errors: string[] = [];

  for (const order of orders) {
    const screenshot = order.paymentScreenshot!;
    try {
      // If it's a Supabase Storage URL, delete the file
      if (screenshot.includes("supabase.co/storage/v1/object/public/") && supabase) {
        // Extract the storage path from the URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/menu-images/screenshots/123-abc.png
        const prefix = `/storage/v1/object/public/${MENU_BUCKET}/`;
        const idx = screenshot.indexOf(prefix);
        if (idx !== -1) {
          const filePath = decodeURIComponent(screenshot.substring(idx + prefix.length));
          const { error: deleteError } = await supabase.storage
            .from(MENU_BUCKET)
            .remove([filePath]);

          if (deleteError) {
            console.error(`[cleanup-screenshots] Storage delete failed for ${order.orderNumber}:`, deleteError.message);
            errors.push(`${order.orderNumber}: storage delete failed - ${deleteError.message}`);
            // Still null the DB field even if storage delete fails (file may already be gone)
          } else {
            storageDeletedCount++;
          }
        }
      } else if (screenshot.startsWith("data:image")) {
        // Base64 data URL — no file to delete from storage, just null the DB field
        dataUrlClearedCount++;
      }

      // Null the paymentScreenshot field in the database
      await db.order.update({
        where: { id: order.id },
        data: { paymentScreenshot: null },
      });

      cleanedCount++;
      console.log(`[cleanup-screenshots] Cleaned screenshot for order ${order.orderNumber} (payment: ${order.paymentStatus}, created: ${order.createdAt.toISOString()})`);
    } catch (e: any) {
      console.error(`[cleanup-screenshots] Error processing ${order.orderNumber}:`, e?.message);
      errors.push(`${order.orderNumber}: ${e?.message || "unknown error"}`);
    }
  }

  const summary = {
    ok: true,
    timestamp: new Date().toISOString(),
    totalChecked: orders.length,
    cleaned: cleanedCount,
    storageFilesDeleted: storageDeletedCount,
    dataUrlsCleared: dataUrlClearedCount,
    errors: errors.length > 0 ? errors : undefined,
  };

  console.log("[cleanup-screenshots] Cleanup complete:", JSON.stringify(summary));
  return NextResponse.json(summary);
}
