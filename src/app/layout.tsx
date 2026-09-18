import type { Metadata, Viewport } from "next";
import { Poppins, Outfit } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/site/sw-register";
import { AuthProvider } from "@/components/providers/auth-provider";
import { InstallPrompt } from "@/components/site/install-prompt";
import { CartToast } from "@/components/site/cart-toast";
import { NotificationPermissionBanner } from "@/components/site/notification-permission-banner";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shankar Sweets & Bakery | Since 1962 — Baraut, Prayagraj",
  description:
    "Authentic Indian sweets, bakery, ice cream, chaat, pizza, burgers and more since 1962. Order online for delivery in Baraut, Prayagraj. Sweets, Bakery, Ice Cream, Chaat.",
  keywords: [
    "Shankar Sweets",
    "Bakery Prayagraj",
    "Baraut sweets",
    "chaat",
    "pizza Prayagraj",
    "ice cream delivery",
    "since 1962",
  ],
  authors: [{ name: "Shankar Sweets & Bakery" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/images/brand/icon-192.png",
    apple: "/images/brand/apple-touch-icon.png",
  },
  openGraph: {
    title: "Shankar Sweets & Bakery | Since 1962",
    description: "Authentic Flavours Now at Your Doorstep — Sweets, Bakery, Ice Cream, Chaat",
    siteName: "Shankar Sweets & Bakery",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shankar Sweets & Bakery | Since 1962",
    description: "Authentic Flavours Now at Your Doorstep",
  },
};

export const viewport: Viewport = {
  themeColor: "#641C27",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${outfit.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {/* Notification permission prompt — shows at the top of every
              customer page (skips /admin routes automatically). Helps users
              grant notification permission BEFORE placing an order, so the
              checkout flow can auto-subscribe without an extra button click. */}
          <NotificationPermissionBanner />
          {children}
          <InstallPrompt />
          <CartToast />
        </AuthProvider>
        <Toaster />
        <SonnerToaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#641C27",
              color: "#FFF8E8",
              border: "1px solid #D4A83E",
              borderRadius: "1rem",
              fontFamily: "var(--font-outfit), sans-serif",
              fontSize: "0.875rem",
              padding: "0.75rem 1.25rem",
            },
            // Sonner renders the description text inside a [data-description]
            // element. By default it uses color:#3f3f3f (dark grey) which on
            // the dark burgundy (#641C27) / red (#B91C1C) toast backgrounds
            // produced contrast of only 1.15:1 — basically unreadable (the
            // shop owner reported "the text below 'invalid coupon' cannot be
            // visible because of the colour of that text"). We force the
            // description to a warm ivory at 92% opacity — contrast 9.86:1
            // on info toasts and 6.11:1 on error toasts, both pass WCAG AA.
            descriptionClassName: "ss-toast-description",
            classNames: {
              description: "ss-toast-description",
            },
            success: {
              iconTheme: { primary: "#E5B84B", secondary: "#641C27" },
            },
            error: {
              style: { background: "#B91C1C", border: "1px solid #FECACA" },
            },
          }}
        />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
