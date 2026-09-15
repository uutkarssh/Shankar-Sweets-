"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, User, Mail, Phone, Check, Loader2, Cake } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-browser";

export default function EditProfilePageWrapper() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center" style={{ background: "#FFF8E8" }}><div className="w-full max-w-3xl space-y-4 px-4 py-6"><div className="skeleton h-6 w-32 skeleton-delay-1" /><div className="skeleton h-24 rounded-2xl skeleton-delay-2" /><div className="skeleton h-24 rounded-2xl skeleton-delay-3" /><div className="skeleton h-12 rounded-full skeleton-delay-4" /></div></div>}>
      <EditProfilePage />
    </Suspense>
  );
}

function EditProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/profile";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  // Date of birth — set ONCE. Once set, the input becomes read-only.
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dobLocked, setDobLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push(`/login?returnTo=/profile/edit`);
        return;
      }
      setAccessToken(session.access_token);
      try {
        const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const d = await res.json();
        if (d.profile) {
          setName(d.profile.name || "");
          setEmail(d.profile.email || "");
          // Extract 10-digit number from "+91 XXXXXXXXXX" format
          if (d.profile.phone) {
            const digits = d.profile.phone.replace(/\D/g, "").slice(-10);
            setPhone(digits);
          }
          // Load DOB — if already set, lock the field so it can't be changed.
          const dob = d.profile.dateOfBirth || "";
          if (dob) {
            setDateOfBirth(dob);
            setDobLocked(true);
          }
        }
      } catch {}
      setLoading(false);
    });
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    // Validate phone if provided
    const phoneDigits = phone.replace(/\D/g, "").slice(-10);
    if (phoneDigits && phoneDigits.length !== 10) {
      toast.error("Phone must be 10 digits");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phoneDigits ? `+91 ${phoneDigits}` : undefined,
          // Only send DOB if it's not already locked (server enforces one-time set anyway).
          dateOfBirth: dobLocked ? undefined : dateOfBirth || undefined,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Profile updated");
        router.push(returnTo);
        router.refresh();
      } else {
        toast.error(d.error || "Update failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "#D4A83E" }} />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-3xl px-3 pt-3 sm:px-4">
          <button onClick={() => router.push(returnTo)} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "#641C27" }}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Back to Profile
          </button>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>Edit Profile</h1>
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          <form onSubmit={handleSave} className="space-y-3">
            {/* Avatar + name */}
            <div className="rounded-2xl border p-5" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: "#641C27" }}>
                  <User style={{ width: 28, height: 28, color: "#E5B84B" }} />
                </div>
                <div className="flex-1">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Full Name *</span>
                    <div className="mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "#E8D9B8", background: "#FFF8E8" }}>
                      <User style={{ width: 16, height: 16, color: "#76544A" }} />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full bg-transparent text-sm focus:outline-none"
                        style={{ color: "#2C1715" }}
                        required
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Contact number */}
            <div className="rounded-2xl border p-5" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <h2 className="mb-3 text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Contact Details</h2>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Phone Number (10 digits) *</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "#D4A83E", background: "#FFF8E8" }}>
                  <Phone style={{ width: 16, height: 16, color: "#76544A" }} />
                  <span className="text-sm font-semibold" style={{ color: "#641C27" }}>+91</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    className="w-full bg-transparent text-sm focus:outline-none"
                    style={{ color: "#2C1715" }}
                  />
                </div>
              </label>
              {!phone && (
                <p className="mt-2 text-[11px] font-semibold" style={{ color: "#B91C1C" }}>
                  Phone number is required for delivery and order updates.
                </p>
              )}
              <label className="mt-3 block">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Email (read-only)</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "#E8D9B8", background: "#F5E8CF" }}>
                  <Mail style={{ width: 16, height: 16, color: "#76544A" }} />
                  <input
                    value={email}
                    readOnly
                    disabled
                    className="w-full bg-transparent text-sm"
                    style={{ color: "#76544A" }}
                  />
                </div>
              </label>
              <label className="mt-3 block">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Date of Birth {dobLocked ? "(read-only)" : "*"}</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: dobLocked ? "#E8D9B8" : "#D4A83E", background: dobLocked ? "#F5E8CF" : "#FFF8E8" }}>
                  <Cake style={{ width: 16, height: 16, color: "#76544A" }} />
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    disabled={dobLocked}
                    readOnly={dobLocked}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full bg-transparent text-sm focus:outline-none disabled:cursor-not-allowed"
                    style={{ color: dobLocked ? "#76544A" : "#2C1715" }}
                  />
                </div>
                {dobLocked ? (
                  <p className="mt-1.5 text-[11px] font-medium" style={{ color: "#76544A" }}>
                    Date of birth can only be set once.
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] font-medium" style={{ color: "#76544A" }}>
                    Set once to unlock birthday offers — this cannot be changed later.
                  </p>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl py-3 text-sm font-bold uppercase tracking-wide transition hover:scale-[1.01] disabled:opacity-50"
              style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> Saving...</span>
              ) : (
                <span className="inline-flex items-center gap-2"><Check style={{ width: 16, height: 16, color: "#E5B84B" }} /> Save Changes</span>
              )}
            </button>
          </form>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
