import { db } from "@/lib/db";

/**
 * Loyalty program helper.
 * Points: 1 point per ₹10 spent (rounded down).
 * Redemption: 100 points = ₹10 discount.
 */

export const POINTS_PER_RUPEE = 0.1; // 1 point per ₹10
export const REDEEM_RATE = 0.1; // 100 points = ₹10

export function pointsForAmount(amount: number): number {
  return Math.floor(amount * POINTS_PER_RUPEE);
}

export function pointsToRupees(points: number): number {
  return Math.round(points * REDEEM_RATE);
}

/**
 * Award loyalty points when an order is delivered.
 * Creates/upserts the LoyaltyAccount + adds an EARNED transaction.
 */
export async function awardLoyaltyPoints(order: {
  id: string;
  customerPhone: string;
  customerName: string;
  total: number;
  status: string;
}): Promise<void> {
  if (order.status !== "DELIVERED") return;
  if (!order.customerPhone) return;

  const points = pointsForAmount(order.total);
  if (points <= 0) return;

  const account = await db.loyaltyAccount.upsert({
    where: { phone: order.customerPhone },
    update: {
      points: { increment: points },
      totalSpent: { increment: order.total },
      ordersCount: { increment: 1 },
      name: order.customerName || undefined,
    },
    create: {
      phone: order.customerPhone,
      name: order.customerName,
      points,
      totalSpent: order.total,
      ordersCount: 1,
    },
  });

  await db.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      points,
      type: "EARNED",
      orderId: order.id,
      note: `Earned from order ${order.total > 0 ? "₹" + Math.round(order.total) : ""}`,
    },
  });
}

/**
 * Get or create a loyalty account for a phone number.
 */
export async function getLoyaltyAccount(phone: string) {
  if (!phone) return null;
  const account = await db.loyaltyAccount.findUnique({
    where: { phone },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  return account;
}
