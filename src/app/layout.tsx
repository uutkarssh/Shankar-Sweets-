import type { Metadata, Viewport } from "next";
import { Poppins, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/site/sw-register";

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
    icon: "/images/brand/logo.png",
    apple: "/images/brand/logo.png",
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
        {children}
        <Toaster />
        <SonnerToaster position="top-center" richColors />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
