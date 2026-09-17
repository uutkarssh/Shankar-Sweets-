import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: `output: "standalone"` was REMOVED — it's for self-hosting, not Vercel.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure Prisma packages are treated as external node modules (not bundled
  // by Turbopack). Critical for Vercel serverless functions.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
  ],
  // Allow Next.js <Image> component to load images from Supabase Storage.
  // Without this, Next.js blocks external images from unlisted domains and
  // images silently fail to load (no error in network tab — just 400s from
  // the _next/image optimizer).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kbkpcsjhxhcenxcnwxho.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Also allow unpkg for Leaflet marker icons
      {
        protocol: "https",
        hostname: "unpkg.com",
        pathname: "/leaflet@**",
      },
    ],
  },
};

export default nextConfig;
