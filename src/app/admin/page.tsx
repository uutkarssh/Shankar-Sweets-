"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Auto-check if already authenticated — redirect to /admin/orders if so
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/auth", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            router.replace("/admin/orders");
            return;
          }
        }
      } catch {
        // ignore
      }
      setCheckingAuth(false);
    })();
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      toast.success("Welcome back, admin");
      router.push("/admin/orders");
      router.refresh();
    } catch (e: any) {
      toast.error("Login failed", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking auth
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(135deg,#641C27,#3D1018)" }}>
        <div className="shimmer h-8 w-8 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: "linear-gradient(135deg,#641C27,#3D1018)" }}>
      <div className="w-full max-w-sm rounded-3xl border p-8" style={{ background: "#FFF8E8", borderColor: "#D4A83E" }}>
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full" style={{ background: "#641C27" }}>
            <Lock style={{ width: 24, height: 24, color: "#E5B84B" }} />
          </div>
          <div className="gold-divider mb-2 mx-auto max-w-[120px]"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>
          <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Admin Access</h1>
          <p className="mt-1 text-xs" style={{ color: "#76544A" }}>Shankar Sweets & Bakery</p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Email</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <Mail style={{ width: 16, height: 16, color: "#76544A" }} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className="w-full bg-transparent text-sm focus:outline-none" style={{ color: "#2C1715" }} required />
            </div>
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Password</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <Lock style={{ width: 16, height: 16, color: "#76544A" }} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent text-sm focus:outline-none" style={{ color: "#2C1715" }} required />
            </div>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-bold uppercase tracking-wide transition hover:scale-[1.02] disabled:opacity-50"
            style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
          >
            {loading ? "Please wait..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
