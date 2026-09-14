import { db } from "@/lib/db";
import type { Metadata, Viewport } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shankar Sweets Admin",
  description: "Admin dashboard for Shankar Sweets & Bakery — manage orders, menu, reviews and UPI verifications.",
  manifest: "/admin-manifest.json",
  icons: {
    icon: "/images/brand/admin-icon.png",
    apple: "/images/brand/admin-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#641C27",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  try {
    await db.restaurantConfig.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });
  } catch {}
  return <>{children}</>;
}
