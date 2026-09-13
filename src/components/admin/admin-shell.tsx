"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ClipboardList, UtensilsCrossed, Star, Settings, LogOut, Home, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { key: "/admin/orders", label: "Orders", icon: ClipboardList },
  { key: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { key: "/admin/featured", label: "Featured", icon: Star },
  { key: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { key: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/auth", { cache: "no-store" })
      .then((r) => { if (mounted) setAuthed(r.ok); if (!r.ok) router.replace("/admin"); })
      .catch(() => { if (mounted) setAuthed(false); });
    return () => { mounted = false; };
  }, [router]);

  if (authed === null) {
    return <div className="grid min-h-screen place-items-center" style={{ background: "#FFF8E8" }}><div className="shimmer h-8 w-8 rounded-full" /></div>;
  }
  if (!authed) {
    router.replace("/admin");
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      {/* Top bar */}
      <header className="ornament-pattern sticky top-0 z-30 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button onClick={() => router.push("/")} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="View site">
            <Home style={{ width: 16, height: 16, color: "#E5B84B" }} />
          </button>
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#E5B84B" }}>Admin Panel</div>
            <div className="text-sm font-bold" style={{ fontFamily: "var(--font-poppins)" }}>Shankar Sweets & Bakery</div>
          </div>
          <button
            onClick={async () => {
              document.cookie = "admin_token=; path=/; max-age=0";
              toast.success("Signed out");
              router.push("/admin");
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
            aria-label="Sign out"
          >
            <LogOut style={{ width: 16, height: 16, color: "#fff" }} />
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 sm:px-4 md:flex-row">
        {/* Sidebar tabs */}
        <aside className="md:w-52 md:shrink-0">
          <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible no-scrollbar">
            {TABS.map((t) => {
              const active = pathname === t.key || pathname.startsWith(t.key + "/");
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => router.push(t.key)}
                  className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition"
                  style={{
                    background: active ? "#641C27" : "#FFFFFF",
                    color: active ? "#FFF8E8" : "#76544A",
                    border: `1px solid ${active ? "#D4A83E" : "#E8D9B8"}`,
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color: active ? "#E5B84B" : "#641C27" }} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 pb-24">{children}</main>
      </div>
    </div>
  );
}
