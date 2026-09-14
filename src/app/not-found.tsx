import Link from "next/link";
import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { ChefHat, Home, Phone } from "lucide-react";

/**
 * Custom 404 page. Marked `dynamic = "force-dynamic"` so the build never
 * tries to statically prerender it (which previously cascaded into the
 * Supabase env-var crash via the root layout's <AuthProvider>).
 */
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFF8E8]">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-[#D4A83E]/20 blur-3xl" />
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#D4A83E] bg-[#641C27] shadow-2xl">
            <ChefHat className="h-14 w-14 text-[#D4A83E]" strokeWidth={1.5} />
          </div>
        </div>

        <p className="font-[var(--font-poppins)] text-7xl font-extrabold text-[#641C27]">
          404
        </p>
        <h1 className="mt-2 font-[var(--font-poppins)] text-2xl font-bold text-[#641C27]">
          This dish isn&apos;t on our menu
        </h1>
        <p className="mt-3 max-w-md font-[var(--font-outfit)] text-sm text-[#5B3A1A]">
          The page you&apos;re looking for has been moved, removed, or never
          existed. Let&apos;s get you back to something delicious.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#641C27] px-7 py-3 font-[var(--font-outfit)] text-sm font-semibold text-[#FFF8E8] shadow-lg transition-transform hover:scale-105 hover:bg-[#7d2533]"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#D4A83E] bg-transparent px-7 py-3 font-[var(--font-outfit)] text-sm font-semibold text-[#641C27] transition-colors hover:bg-[#D4A83E]/10"
          >
            Browse Menu
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#641C27]/30 px-7 py-3 font-[var(--font-outfit)] text-sm font-semibold text-[#641C27] transition-colors hover:border-[#641C27]/60"
          >
            <Phone className="h-4 w-4" />
            Contact Us
          </Link>
        </div>

        <p className="mt-10 font-[var(--font-outfit)] text-xs uppercase tracking-[0.3em] text-[#5B3A1A]/60">
          Shankar Sweets &amp; Bakery · Since 1962
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
