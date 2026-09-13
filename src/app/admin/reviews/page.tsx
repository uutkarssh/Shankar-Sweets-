"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useEffect, useState } from "react";
import { Star, Eye, EyeOff, Trash2, ShieldCheck, MessageSquare } from "lucide-react";
import { toast } from "sonner";

type Review = {
  id: string;
  itemId: string;
  customerName: string;
  customerPhone: string;
  rating: number;
  comment: string | null;
  verified: boolean;
  active: boolean;
  createdAt: string;
  item: { name: string };
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "hidden">("all");

  const load = async () => {
    try {
      const res = await fetch("/api/admin/reviews", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setReviews(d.reviews || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

   
  useEffect(() => { load(); }, []);

  const patch = async (reviewId: string, action: "hide" | "show" | "delete") => {
    const res = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, action }),
    });
    if (res.ok) {
      toast.success(action === "delete" ? "Review deleted" : action === "hide" ? "Review hidden" : "Review shown");
      load();
    } else {
      toast.error("Action failed");
    }
  };

  const filtered = reviews.filter((r) => {
    if (filter === "active") return r.active;
    if (filter === "hidden") return !r.active;
    return true;
  });

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <AdminShell>
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Reviews Moderation</h1>
        <div className="gold-divider mt-2"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="Total Reviews" value={reviews.length} icon={MessageSquare} />
        <StatCard label="Average Rating" value={avgRating} icon={Star} />
        <StatCard label="Verified Buyers" value={reviews.filter((r) => r.verified).length} icon={ShieldCheck} />
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex gap-2">
        {(["all", "active", "hidden"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition"
            style={{
              background: filter === f ? "#641C27" : "#F5E8CF",
              color: filter === f ? "#FFF8E8" : "#641C27",
              border: `1px solid ${filter === f ? "#641C27" : "#E8D9B8"}`,
            }}
          >
            {f} ({f === "all" ? reviews.length : f === "active" ? reviews.filter((r) => r.active).length : reviews.filter((r) => !r.active).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="shimmer h-24 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
          <MessageSquare style={{ width: 36, height: 36, color: "#D4A83E", margin: "0 auto" }} />
          <p className="mt-2 text-sm font-semibold" style={{ color: "#641C27" }}>No reviews here</p>
          <p className="text-xs" style={{ color: "#76544A" }}>Customer reviews will appear here for moderation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rv) => (
            <div
              key={rv.id}
              className="rounded-2xl border p-4"
              style={{
                borderColor: rv.active ? "#E8D9B8" : "#FECACA",
                background: rv.active ? "#FFFFFF" : "#FEF2F2",
                opacity: rv.active ? 1 : 0.7,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
                      {rv.item.name}
                    </span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} style={{ width: 11, height: 11 }} className={n <= rv.rating ? "fill-current" : ""} color={n <= rv.rating ? "#E5B84B" : "#E8D9B8"} />
                      ))}
                    </div>
                    {rv.verified && (
                      <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ background: "#2F6B4522", color: "#2F6B45" }}>
                        <ShieldCheck style={{ width: 9, height: 9 }} /> Verified
                      </span>
                    )}
                    {!rv.active && (
                      <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ background: "#B91C1C22", color: "#B91C1C" }}>
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "#76544A" }}>
                    By <strong style={{ color: "#3D1018" }}>{rv.customerName}</strong> · {rv.customerPhone} · {new Date(rv.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  {rv.comment && (
                    <p className="mt-2 rounded-lg p-2 text-xs" style={{ background: "#FFF8E8", color: "#3D1015" }}>
                      &ldquo;{rv.comment}&rdquo;
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-1.5">
                {rv.active ? (
                  <ActionBtn onClick={() => patch(rv.id, "hide")} icon={EyeOff} label="Hide" />
                ) : (
                  <ActionBtn onClick={() => patch(rv.id, "show")} icon={Eye} label="Show" />
                )}
                <ActionBtn onClick={() => { if (confirm("Delete this review permanently?")) patch(rv.id, "delete"); }} icon={Trash2} label="Delete" danger />
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: any; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border p-3 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
      <Icon style={{ width: 18, height: 18, margin: "0 auto", color: "#D4A83E" }} />
      <div className="mt-1 text-lg font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: "#76544A" }}>{label}</div>
    </div>
  );
}

function ActionBtn({ onClick, icon: Icon, label, danger }: { onClick: () => void; icon: React.ElementType; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition hover:scale-[1.02]"
      style={{
        borderColor: danger ? "#FECACA" : "#E8D9B8",
        background: danger ? "#FEE2E2" : "#F5E8CF",
        color: danger ? "#B91C1C" : "#641C27",
      }}
    >
      <Icon style={{ width: 11, height: 11 }} /> {label}
    </button>
  );
}
