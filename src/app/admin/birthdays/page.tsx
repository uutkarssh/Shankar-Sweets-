"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useEffect, useMemo, useState } from "react";
import { Cake, Phone, MessageCircle, Search, Loader2, RefreshCw, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";

type BirthdayCustomer = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string;
  dateOfBirth: string;
  createdAt: string;
  updatedAt: string;
  isBirthdayToday: boolean;
  daysUntilBirthday: number;
  upcomingDate: string | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDob(dob: string): string {
  // dob is YYYY-MM-DD → display as "16 Sep 1990"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return dob;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return `${d} ${MONTHS[mo - 1]} ${y}`;
}

function formatUpcomingIn(days: number): string {
  if (days === 0) return "Today 🎂";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 30) return `In ~${Math.round(days / 7)} weeks`;
  if (days < 365) return `In ~${Math.round(days / 30)} months`;
  return "Next year";
}

function phoneDigits(phone: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  if (d.length >= 10) return d.slice(-10);
  return null;
}

function whatsappLink(phone: string | null, name: string | null): string | null {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  const text = encodeURIComponent(
    `Dear ${name || "Customer"}, wishing you a very Happy Birthday from Shankar Sweets & Bakery! 🎂\n\nAs a birthday gift, use code BIRTHDAY10 today for 10% off your order.`
  );
  return `https://wa.me/91${digits}?text=${text}`;
}

function callLink(phone: string | null): string | null {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return `tel:+91${digits}`;
}

export default function AdminBirthdaysPage() {
  const [customers, setCustomers] = useState<BirthdayCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showTodayOnly, setShowTodayOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/birthdays", { credentials: "include", cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setCustomers(d.customers || []);
      } else if (res.status === 401) {
        toast.error("Admin session expired — please sign in again");
      } else {
        toast.error("Failed to load birthday customers");
      }
    } catch {
      toast.error("Failed to load birthday customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const todayList = useMemo(
    () => customers.filter((c) => c.isBirthdayToday),
    [customers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = customers;
    if (showTodayOnly) list = list.filter((c) => c.isBirthdayToday);
    if (q) {
      list = list.filter((c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.dateOfBirth || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, search, showTodayOnly]);

  return (
    <AdminShell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
            Birthday Customers
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: "#76544A" }}>
            Wish them &amp; remind them about <span className="font-mono font-bold" style={{ color: "#641C27" }}>BIRTHDAY10</span> — valid only on their actual birthday.
          </p>
          <div className="gold-divider mt-2"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
          style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#641C27" }}
        >
          {loading ? <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} /> : <RefreshCw style={{ width: 12, height: 12 }} />}
          Refresh
        </button>
      </div>

      {/* Today's birthdays banner */}
      <div
        className="mb-4 overflow-hidden rounded-2xl border p-4"
        style={{
          borderColor: todayList.length > 0 ? "#D4A83E" : "#E8D9B8",
          background: todayList.length > 0
            ? "linear-gradient(135deg, #641C27 0%, #3D1018 100%)"
            : "#FFFFFF",
          color: todayList.length > 0 ? "#FFF8E8" : "#76544A",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
            style={{ background: todayList.length > 0 ? "rgba(212,168,62,0.2)" : "#F5E8CF" }}
          >
            <Cake style={{ width: 24, height: 24, color: todayList.length > 0 ? "#E5B84B" : "#641C27" }} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: todayList.length > 0 ? "#E5B84B" : "#76544A" }}>
              Today&apos;s Birthdays
            </div>
            <div className="text-base font-bold" style={{ fontFamily: "var(--font-poppins)" }}>
              {todayList.length === 0
                ? "No birthdays today"
                : `${todayList.length} customer${todayList.length === 1 ? "" : "s"} celebrating today`}
            </div>
            {todayList.length > 0 && (
              <div className="mt-0.5 text-[11px]" style={{ color: "rgba(255,248,232,0.85)" }}>
                Tap WhatsApp or Call below to wish them and remind about BIRTHDAY10.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
          <Search style={{ width: 14, height: 14, color: "#76544A" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, or DOB…"
            className="w-full bg-transparent text-sm focus:outline-none"
            style={{ color: "#2C1715" }}
          />
        </div>
        <button
          onClick={() => setShowTodayOnly((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide"
          style={{
            borderColor: showTodayOnly ? "#D4A83E" : "#E8D9B8",
            background: showTodayOnly ? "#641C27" : "#FFFFFF",
            color: showTodayOnly ? "#FFF8E8" : "#641C27",
          }}
        >
          <Sparkles style={{ width: 12, height: 12, color: showTodayOnly ? "#E5B84B" : "#641C27" }} />
          {showTodayOnly ? "Showing today only" : "Today only"}
        </button>
      </div>

      {/* Customer list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`rounded-2xl border p-4 skeleton-delay-${i}`} style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }} aria-hidden>
              <div className="flex items-center gap-3">
                <div className="skeleton h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-32" />
                  <div className="skeleton h-2.5 w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
          <Calendar style={{ width: 36, height: 36, color: "#D4A83E", margin: "0 auto" }} />
          <p className="mt-2 text-sm font-semibold" style={{ color: "#641C27" }}>
            {search || showTodayOnly ? "No matching customers" : "No customers with DOB yet"}
          </p>
          <p className="text-xs" style={{ color: "#76544A" }}>
            {search || showTodayOnly
              ? "Try clearing the search / filter."
              : "Customers who set a date of birth in their profile will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border p-3.5"
              style={{
                borderColor: c.isBirthdayToday ? "#D4A83E" : "#E8D9B8",
                background: c.isBirthdayToday ? "#FFF8E8" : "#FFFFFF",
                boxShadow: c.isBirthdayToday ? "0 4px 18px -8px rgba(212,168,62,0.5)" : "none",
              }}
            >
              <div className="flex items-start gap-3">
                {/* Date badge */}
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-center"
                  style={{
                    background: c.isBirthdayToday ? "#641C27" : "#F5E8CF",
                    color: c.isBirthdayToday ? "#E5B84B" : "#641C27",
                  }}
                >
                  <div className="text-[9px] font-bold uppercase leading-none">{c.dateOfBirth ? MONTHS[Number(c.dateOfBirth.slice(5, 7)) - 1] : "?"}</div>
                  <div className="text-base font-extrabold leading-tight" style={{ fontFamily: "var(--font-poppins)" }}>
                    {c.dateOfBirth ? Number(c.dateOfBirth.slice(8, 10)) : "?"}
                  </div>
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
                      {c.name || "(no name)"}
                    </span>
                    {c.isBirthdayToday && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide animate-soft-pulse"
                        style={{ background: "#641C27", color: "#E5B84B" }}
                      >
                        🎂 Birthday Today
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: "#76544A" }}>
                    {c.phone || "No phone"} · {formatDob(c.dateOfBirth)}
                  </div>
                  <div className="mt-0.5 text-[10px]" style={{ color: "#76544A" }}>
                    Next birthday:{" "}
                    <span className="font-semibold" style={{ color: c.isBirthdayToday ? "#2F6B45" : "#641C27" }}>
                      {c.upcomingDate ? formatUpcomingIn(c.daysUntilBirthday) : "—"}
                    </span>
                    {c.email && <span> · {c.email}</span>}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {whatsappLink(c.phone, c.name) && (
                      <a
                        href={whatsappLink(c.phone, c.name)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition hover:scale-[1.02]"
                        style={{ borderColor: "#2F6B45", background: "#2F6B4512", color: "#2F6B45" }}
                      >
                        <MessageCircle style={{ width: 11, height: 11 }} /> WhatsApp
                      </a>
                    )}
                    {callLink(c.phone) && (
                      <a
                        href={callLink(c.phone)!}
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition hover:scale-[1.02]"
                        style={{ borderColor: "#E8D9B8", background: "#F5E8CF", color: "#641C27" }}
                      >
                        <Phone style={{ width: 11, height: 11 }} /> Call
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && (
        <div className="mt-4 text-center text-[10px]" style={{ color: "#76544A" }}>
          Showing {filtered.length} of {customers.length} customer{customers.length === 1 ? "" : "s"} with DOB on file
        </div>
      )}
    </AdminShell>
  );
}
