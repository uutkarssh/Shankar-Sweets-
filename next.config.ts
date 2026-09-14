import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: `output: "standalone"` was REMOVED — it's for self-hosting, not Vercel.
  // On Vercel, standalone mode changes the build output structure and can cause
  // the Prisma generated client and env vars to not be properly available in
  // serverless functions. Vercel has its own serverless deployment system.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure Prisma packages are treated as external node modules (not bundled
  // by Turbopack). This is critical for Vercel serverless functions — the
  // Prisma generated client and adapter must be resolved at runtime, not
  // inlined at build time.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
  ],
};

export default nextConfig;
