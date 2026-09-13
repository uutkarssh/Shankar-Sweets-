"use client";

import { useEffect, useState } from "react";
import { Star, MessageSquare, Send, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Review = {
  id: string;
  customerName: string;
  rating: number;
  comment: string | null;
  verified: boolean;
  createdAt: string;
};

export function ReviewsSection({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/reviews?itemId=${itemId}`, { cache: "no-store" });
      const d = await res.json();
      setReviews(d.reviews || []);
      setAverage(d.average || 0);
      setCount(d.count || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

   
  useEffect(() => { load(); }, [itemId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { toast.error("Enter your name"); return; }
    if (phone.replace(/\D/g, "").length !== 10) { toast.error("Enter a valid 10-digit phone"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, customerName: name, customerPhone: phone, rating, comment }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(d.review?.verified ? "Review posted (verified buyer)" : "Review posted");
        setShowForm(false);
        setName(""); setPhone(""); setComment(""); setRating(5);
        load();
      } else {
        toast.error(d.error || "Failed to post review");
      }
    } catch {
      toast.error("Failed to post review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare style={{ width: 18, height: 18, color: "#D4A83E" }} />
          <h2 className="text-base font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
            Reviews & Ratings
          </h2>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
          style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
        >
          {showForm ? "Cancel" : "Write a Review"}
        </button>
      </div>

      {/* Rating summary */}
      <div className="mt-3 flex items-center gap-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
        <div className="text-center">
          <div className="text-3xl font-extrabold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
            {average.toFixed(1)}
          </div>
          <div className="flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} style={{ width: 12, height: 12 }} className={n <= Math.round(average) ? "fill-current" : ""} color={n <= Math.round(average) ? "#E5B84B" : "#E8D9B8"} />
            ))}
          </div>
          <div className="mt-0.5 text-[10px]" style={{ color: "#76544A" }}>{count} review{count !== 1 ? "s" : ""}</div>
        </div>
        <div className="h-12 w-px" style={{ background: "#E8D9B8" }} />
        <p className="flex-1 text-xs" style={{ color: "#76544A" }}>
          Share your experience with <strong style={{ color: "#3D1018" }}>{itemName}</strong>. Verified buyers get a special badge.
        </p>
      </div>

      {/* Write form */}
      {showForm && (
        <form onSubmit={submit} className="mt-3 animate-fade-in-up rounded-2xl border p-4" style={{ borderColor: "#D4A83E", background: "#FFFFFF" }}>
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit phone" inputMode="numeric" className="rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
          </div>
          <div className="mt-2 flex items-center gap-1">
            <span className="mr-2 text-xs font-semibold" style={{ color: "#76544A" }}>Rating:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star style={{ width: 24, height: 24 }} className={n <= rating ? "fill-current transition" : "transition"} color={n <= rating ? "#E5B84B" : "#E8D9B8"} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your thoughts (optional)..." rows={3} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
          <button type="submit" disabled={submitting} className="mt-2 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-50" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
            <Send style={{ width: 12, height: 12, color: "#E5B84B" }} /> {submitting ? "Posting..." : "Post Review"}
          </button>
        </form>
      )}

      {/* Reviews list */}
      <div className="mt-4 space-y-3">
        {loading ? (
          [1, 2].map((i) => <div key={i} className="shimmer h-24 rounded-2xl" />)
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <MessageSquare style={{ width: 28, height: 28, color: "#D4A83E", margin: "0 auto" }} />
            <p className="mt-1 text-sm font-semibold" style={{ color: "#641C27" }}>No reviews yet</p>
            <p className="text-xs" style={{ color: "#76544A" }}>Be the first to review this item!</p>
          </div>
        ) : (
          reviews.map((rv) => (
            <div key={rv.id} className="animate-fade-in-up rounded-2xl border p-3" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold" style={{ background: "#641C27", color: "#E5B84B" }}>
                    {rv.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{rv.customerName}</span>
                      {rv.verified && (
                        <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ background: "#2F6B4522", color: "#2F6B45" }}>
                          <ShieldCheck style={{ width: 9, height: 9 }} /> Verified Buyer
                        </span>
                      )}
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} style={{ width: 10, height: 10 }} className={n <= rv.rating ? "fill-current" : ""} color={n <= rv.rating ? "#E5B84B" : "#E8D9B8"} />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-[10px]" style={{ color: "#76544A" }}>
                  {new Date(rv.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              {rv.comment && <p className="mt-2 text-xs leading-relaxed" style={{ color: "#3D1015" }}>{rv.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
