import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Returns all customers with a dateOfBirth on file, decorated with:
 *   - isBirthdayToday: boolean (DOB day+month matches today in IST)
 *   - daysUntilBirthday: number of days from today (IST) until the next
 *     occurrence of the customer's birthday (0 = today, 1 = tomorrow, …
 *     364 = day after tomorrow next-year wrap). Used for sorting the
 *     "upcoming birthdays" list.
 *
 * Auth: requires admin session (same as all /api/admin/* endpoints).
 */
export async function GET(req: Request) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch every customer with a non-empty DOB string.
  const customers = await db.customer.findMany({
    where: { dateOfBirth: { not: null } },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      dateOfBirth: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Filter out blank/invalid DOB strings (defensive — schema allows String?,
  // and a customer could in principle have an empty string instead of null).
  const withDob = customers.filter((c) => {
    const dob = (c.dateOfBirth ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(dob);
  });

  // Today in IST — the restaurant is in Prayagraj, India. We must use IST
  // (not the server's local TZ, which is UTC on Vercel) so "today's
  // birthdays" matches what the customer-facing BIRTHDAY10 validator
  // considers "today" — otherwise the admin list and the coupon would
  // disagree near midnight IST.
  const today = getISTToday();

  const decorated = withDob.map((c) => {
    const parts = parseDobParts(c.dateOfBirth!);
    if (!parts) {
      return {
        ...c,
        isBirthdayToday: false,
        daysUntilBirthday: 9999, // sink invalid rows to the bottom
        upcomingDate: null as string | null,
      };
    }
    const isBirthdayToday =
      parts.month === today.month && parts.day === today.day;

    // Compute the next occurrence of (month, day) at or after today.
    // If this year's birthday already passed, use next year's.
    let upcomingYear = today.year;
    if (parts.month < today.month ||
        (parts.month === today.month && parts.day < today.day)) {
      upcomingYear = today.year + 1;
    }
    const upcomingDate = `${upcomingYear}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;

    // Days between today and upcomingDate (both at local-midnight). Using
    // Date.UTC avoids any TZ drift in the subtraction.
    const msPerDay = 24 * 60 * 60 * 1000;
    const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
    const upcomingUtc = Date.UTC(upcomingYear, parts.month - 1, parts.day);
    const daysUntilBirthday = Math.round((upcomingUtc - todayUtc) / msPerDay);

    return {
      ...c,
      isBirthdayToday,
      daysUntilBirthday,
      upcomingDate,
    };
  });

  // Sort by daysUntilBirthday ascending — today's birthdays (0) first,
  // then tomorrow, etc. Wraps around the year so a birthday that just
  // passed yesterday appears at the BOTTOM (364 days until next one).
  decorated.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

  const todayCount = decorated.filter((c) => c.isBirthdayToday).length;

  return NextResponse.json({
    todayCount,
    total: decorated.length,
    customers: decorated,
  });
}

// ─── Helpers (mirror of the ones in /api/coupons/validate/route.ts) ───────

function getISTToday(): { day: number; month: number; year: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Calcutta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return { day: d, month: m, year: y };
}

function parseDobParts(dob: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}
