import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCouponWithDB } from "@/lib/coupon-db";

export const dynamic = "force-dynamic";

/**
 * Normalize an Indian phone number to the canonical "+91 XXXXXXXXXX" format
 * used in the Customer and Order tables. Returns null if the input isn't a
 * valid 10-digit Indian mobile number.
 */
function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `+91 ${digits}`;
  }
  return null;
}

/**
 * Return today's day / month / year in the restaurant's local timezone
 * (Asia/Calcutta, IST = UTC+5:30). The shop is in Prayagraj, India and
 * customers observe IST — so "is today your birthday?" must be answered
 * in IST, not in whatever timezone the server happens to run in (Vercel
 * runs in UTC by default, which would drift by ~5.5 hours and could push
 * a birthday from "today" to "yesterday" or "tomorrow" near midnight).
 *
 * Implementation uses Intl.DateTimeFormat with timeZone: "Asia/Calcutta",
 * which converts the UTC instant into IST calendar parts without depending
 * on process.env.TZ or a DST table. Returns month in 1-12 (not 0-11) for
 * easier comparison against a YYYY-MM-DD DOB string.
 */
function getISTToday(): { day: number; month: number; year: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Calcutta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value); // 1-12
  const d = Number(parts.find((p) => p.type === "day")?.value); // 1-31
  return { day: d, month: m, year: y };
}

/**
 * Parse a YYYY-MM-DD DOB string into { year, month (1-12), day (1-31) }.
 * Done with a regex + Number() instead of `new Date(dob)` because the
 * Date constructor parses YYYY-MM-DD as UTC midnight, which then drifts
 * by a day when read back with .getDate()/.getMonth() in a non-UTC
 * timezone. String parsing has no timezone ambiguity at all.
 */
function parseDobParts(dob: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

// POST: validate a coupon code against cart
export async function POST(req: Request) {
  try {
    const { code, cartSubtotal, deliveryFee, categorySubtotals, phone } = await req.json();
    if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
    const result = await validateCouponWithDB(
      String(code),
      Number(cartSubtotal || 0),
      Number(deliveryFee || 0),
      categorySubtotals
    );

    // ─── One-time-use enforcement for special coupons ───
    // These checks run only if the coupon passed the regular validation
    // (exists, not expired, meets min order, etc.). We override the result
    // with a specific rejection message if the user is not eligible.
    const normalizedCode = String(code).trim().toUpperCase();
    const normalizedPhone = normalizePhone(phone);

    if (result.valid && normalizedCode === "NEWUSER10") {
      // NEWUSER10: one-time use per customer (matched by phone).
      if (!normalizedPhone) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "Please sign in with your phone number to use this coupon",
        });
      }
      // Look up any previous order by this phone that used NEWUSER10.
      // We fetch all orders with this couponCode for the phone and filter
      // case-insensitively in JS (SQLite doesn't support `mode: insensitive`
      // reliably across all Prisma versions).
      const previousOrders = await db.order.findMany({
        where: { customerPhone: normalizedPhone, couponCode: { not: null } },
        select: { couponCode: true, status: true },
      });
      const alreadyUsed = previousOrders.some(
        (o) =>
          o.couponCode?.toUpperCase() === "NEWUSER10" &&
          o.status !== "REJECTED"
      );
      if (alreadyUsed) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "This coupon has already been used",
        });
      }
    }

    if (result.valid && normalizedCode === "BIRTHDAY10") {
      // BIRTHDAY10: valid ONLY on the customer's actual birthday
      // (day + month match against IST "today"), once per calendar year.
      //
      // Previous implementation was broken in three ways:
      //   1. It compared only the MONTH (`dobDate.getMonth() !== now.getMonth()`),
      //      so the coupon would be valid for the entire birthday month —
      //      contrary to the coupon's promise of "10% off on your Birthday".
      //   2. It used `new Date(dob)` + `.getMonth()` / `new Date()` + `.getMonth()`
      //      — both timezone-sensitive. `new Date("YYYY-MM-DD")` parses as UTC
      //      midnight, and `.getMonth()` reads in the server's local timezone
      //      (UTC on Vercel). Around midnight IST this drifts by ~5.5 hours
      //      and can flip the day, making a real birthday appear as "not today".
      //   3. The customer lookup used `findFirst` with an OR clause over
      //      `phone` and `phone contains digits`, which is non-deterministic
      //      when multiple customers share the same phone — it picked the
      //      wrong customer and rejected the coupon even on the right day.
      //
      // The fix:
      //   - Look up ALL customers matching the canonical phone, deterministically
      //     ordered by updatedAt desc.
      //   - Parse the DOB string directly (no Date object → no TZ drift).
      //   - Compute "today" in IST via Intl.DateTimeFormat.
      //   - The coupon is valid if ANY matching customer has DOB day+month == today.
      //     (This correctly handles the duplicate-phone edge case where two
      //     accounts share a number but only one has a birthday today.)
      if (!normalizedPhone) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "Please sign in with your phone number to use this coupon",
        });
      }

      // Deterministic lookup: prefer exact canonical-phone match, ordered by
      // most recently updated so we get a stable pick when several customers
      // share the same number. Fall back to a "contains last 10 digits" query
      // only if no exact match exists (covers legacy rows stored as raw digits).
      let customers = await db.customer.findMany({
        where: { phone: normalizedPhone },
        select: { id: true, name: true, phone: true, dateOfBirth: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      });
      if (customers.length === 0) {
        const digits10 = normalizedPhone.replace(/\D/g, "").slice(-10);
        if (digits10.length === 10) {
          customers = await db.customer.findMany({
            where: { phone: { contains: digits10 } },
            select: { id: true, name: true, phone: true, dateOfBirth: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
          });
        }
      }

      if (customers.length === 0) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "Please set your date of birth in your profile to use this coupon",
        });
      }

      // Any customer sharing this phone whose DOB (day+month) is today makes
      // the coupon valid. This matches user expectations: a customer with a
      // real birthday today shouldn't be rejected because a sibling account
      // with the same number has a different DOB.
      const today = getISTToday();
      const matchingDobs = customers
        .map((c) => (c.dateOfBirth ? parseDobParts(c.dateOfBirth) : null))
        .filter((p): p is { year: number; month: number; day: number } => p !== null);

      if (matchingDobs.length === 0) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "Please set your date of birth in your profile to use this coupon",
        });
      }

      const isBirthdayToday = matchingDobs.some(
        (p) => p.month === today.month && p.day === today.day
      );
      if (!isBirthdayToday) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "This coupon is only valid on your birthday",
        });
      }

      // Once-per-calendar-year enforcement, keyed by phone (so the limit is
      // shared across accounts that reuse the same number — the order is
      // placed against the phone, not the customer row).
      const yearStart = new Date(today.year, 0, 1);
      const yearEnd = new Date(today.year + 1, 0, 1);
      const yearOrders = await db.order.findMany({
        where: {
          customerPhone: normalizedPhone,
          couponCode: { not: null },
          createdAt: { gte: yearStart, lt: yearEnd },
        },
        select: { couponCode: true, status: true },
      });
      const usedThisYear = yearOrders.some(
        (o) =>
          o.couponCode?.toUpperCase() === "BIRTHDAY10" &&
          o.status !== "REJECTED"
      );
      if (usedThisYear) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "Birthday coupon already used this year",
        });
      }
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
