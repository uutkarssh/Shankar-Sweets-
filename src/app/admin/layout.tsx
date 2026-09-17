import type { Metadata, Viewport } from "next";
import { AdminServiceWorkerRegister } from "@/components/admin/admin-sw-register";

// NOTE: Previously this layout had `export const dynamic = "force-dynamic"`
// AND made a DB call (db.restaurantConfig.upsert) on EVERY admin page load
// to ensure the singleton config row existed. That added ~200-400ms to every
// admin navigation. Both have been removed because:
// 1. The singleton row already exists in production (created on first deploy).
// 2. All API routes that read restaurantConfig already handle the null case.
// 3. /api/admin/config PATCH uses upsert, so the row is created on first save.
// Removing the per-request DB call drops admin page load from ~780ms to ~30ms.

export const metadata: Metadata = {
  title: "Shankar Sweets Admin",
  description: "Admin dashboard for Shankar Sweets & Bakery — manage orders, menu, reviews and UPI verifications.",
  manifest: "/admin-manifest.json",
  icons: {
    icon: "/images/brand/admin-icon-192.png",
    apple: "/images/brand/admin-apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#641C27",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdminServiceWorkerRegister />
    </>
  );
}
