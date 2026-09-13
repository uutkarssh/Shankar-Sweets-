import { db } from "@/lib/db";
import { formatINR } from "@/lib/constants";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: string;
  landmark: string | null;
  pincode: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  items: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentScreenshot: string | null;
  status: string;
  notes: string | null;
};

function escapeMd(t: string) {
  return t.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

function buildMessage(order: Order, statusLabel: string): string {
  let items: any[] = [];
  try { items = JSON.parse(order.items); } catch {}
  const lines = items.map((it: any) => `• ${it.name} (${it.variant?.label ?? "—"}) ×${it.qty} — ${formatINR((it.variant?.price ?? 0) * it.qty)}`).join("\n");
  const mapsLink = order.lat != null && order.lng != null
    ? `https://www.google.com/maps?q=${order.lat},${order.lng}`
    : `https://www.google.com/maps?q=${encodeURIComponent(order.address)}`;
  const callLink = `tel:${order.customerPhone}`;

  return [
    `*New Order — Shankar Sweets*`,
    ``,
    `*Order:* ${order.orderNumber}`,
    `*Status:* ${statusLabel}`,
    ``,
    `*Customer:* ${order.customerName}`,
    `*Phone:* ${order.customerPhone}`,
    order.customerEmail ? `*Email:* ${order.customerEmail}` : "",
    ``,
    `*Items:*`,
    lines,
    ``,
    `*Subtotal:* ${formatINR(order.subtotal)}`,
    `*Delivery:* ${order.deliveryFee === 0 ? "FREE" : formatINR(order.deliveryFee)}`,
    `*Total:* ${formatINR(order.total)}`,
    `*Payment:* ${order.paymentMethod} (${order.paymentStatus})`,
    order.distanceKm != null ? `*Distance:* ${order.distanceKm.toFixed(2)} km` : "",
    ``,
    `*Address:* ${order.address}`,
    order.landmark ? `*Landmark:* ${order.landmark}` : "",
    `*PIN:* ${order.pincode}`,
    order.notes ? `*Notes:* ${order.notes}` : "",
  ].filter(Boolean).join("\n");
}

function inlineKeyboard(order: Order) {
  const base = `oid=${order.id}`;
  const mapsLink = order.lat != null && order.lng != null
    ? `https://www.google.com/maps?q=${order.lat},${order.lng}`
    : `https://www.google.com/maps?q=${encodeURIComponent(order.address)}`;
  const screenshotUrl = order.paymentScreenshot;

  const rows: { text: string; url?: string; callback_data?: string }[][] = [[
    { text: "Accept", callback_data: `${base}|ACCEPTED` },
    { text: "Reject", callback_data: `${base}|REJECTED` },
  ]];

  if (order.status === "ACCEPTED" || order.status === "PREPARING") {
    rows.push([
      { text: "Mark Preparing", callback_data: `${base}|PREPARING` },
      { text: "Out for Delivery", callback_data: `${base}|OUT_FOR_DELIVERY` },
    ]);
  }
  if (order.status === "OUT_FOR_DELIVERY") {
    rows.push([{ text: "Mark Delivered", callback_data: `${base}|DELIVERED` }]);
  }

  // Telegram only accepts http/https URLs in inline keyboards.
  const utilityRow: { text: string; url?: string; callback_data?: string }[] = [
    { text: `Call ${order.customerPhone}`, url: mapsLink },
    { text: "Open Location", url: mapsLink },
  ];
  rows.push(utilityRow);

  if (order.paymentMethod === "UPI") {
    rows.push([
      { text: "Approve Payment", callback_data: `${base}|PAY_APPROVE` },
      { text: "Reject Payment", callback_data: `${base}|PAY_REJECT` },
    ]);
    if (screenshotUrl && !screenshotUrl.startsWith("data:")) {
      rows.push([{ text: "View Payment Screenshot", url: screenshotUrl }]);
    }
  }

  return { inline_keyboard: rows };
}

async function sendTelegram(method: string, payload: any) {
  if (!BOT_TOKEN || CHAT_IDS.length === 0) return null;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("Telegram error:", txt);
    return null;
  }
  return res.json();
}

export async function notifyTelegramNewOrder(order: Order) {
  const text = buildMessage(order, "PENDING");
  const reply_markup = inlineKeyboard(order);
  const messageIds: Record<string, number> = {};
  for (const chatId of CHAT_IDS) {
    const r = await sendTelegram("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      reply_markup,
    });
    if (r?.result?.message_id) messageIds[chatId] = r.result.message_id;
  }
  // Persist the first message id for editing in place
  const firstMsgId = Object.values(messageIds)[0];
  if (firstMsgId) {
    await db.order.update({ where: { id: order.id }, data: { telegramMessageId: String(firstMsgId) } });
  }
  return messageIds;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  REJECTED: "Rejected",
};

export async function editTelegramOrderStatus(order: Order) {
  if (!order.telegramMessageId) return;
  const text = buildMessage(order, STATUS_LABELS[order.status] || order.status);
  const reply_markup = inlineKeyboard(order);
  for (const chatId of CHAT_IDS) {
    await sendTelegram("editMessageText", {
      chat_id: chatId,
      message_id: Number(order.telegramMessageId),
      text,
      parse_mode: "Markdown",
      reply_markup,
    });
  }
}
