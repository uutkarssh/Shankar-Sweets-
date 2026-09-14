"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useEffect, useState } from "react";
import { Star, GripVertical, X } from "lucide-react";
import { toast } from "sonner";

type Item = { id: string; name: string; image: string | null; featured: boolean; featuredOrder: number; price: number; categoryId: string };

export default function AdminFeaturedPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/menu", { credentials: "include", cache: "no-store" });
    const d = await res.json();
    const all: Item[] = (d.categories || []).flatMap((c: any) => c.items || []);
    setItems(all);
  };
   
  useEffect(() => { load(); }, []);

  const featured = items.filter((i) => i.featured).sort((a, b) => a.featuredOrder - b.featuredOrder);
  const available = items.filter((i) => !i.featured);

  const toggle = async (id: string, make: boolean) => {
    await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-item", id, featured: make }),
    });
    load();
  };

  const reorder = (from: number, to: number) => {
    const arr = [...featured];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setItems((prev) => {
      const next = prev.filter((i) => !i.featured);
      arr.forEach((it, idx) => next.push({ ...it, featured: true, featuredOrder: idx }));
      return next;
    });
  };

  const saveOrder = async () => {
    const order = featured.map((i, idx) => ({ id: i.id, featuredOrder: idx }));
    await fetch("/api/admin/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
    toast.success("Featured order saved");
  };

  return (
    <AdminShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Featured Items</h1>
          <div className="gold-divider mt-2"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>
        </div>
        <button onClick={saveOrder} className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>Save Order</button>
      </div>

      <p className="mb-4 text-xs" style={{ color: "#76544A" }}>Drag to reorder featured items shown on the homepage. Toggle the star to feature/unfeature.</p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Featured (draggable) */}
        <div>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
            <Star className="fill-current" style={{ width: 14, height: 14, color: "#E5B84B" }} /> Featured ({featured.length})
          </h2>
          <div className="space-y-2">
            {featured.map((it, idx) => (
              <div
                key={it.id}
                draggable
                onDragStart={() => setDragId(it.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const fromIdx = featured.findIndex((x) => x.id === dragId);
                  if (fromIdx >= 0 && fromIdx !== idx) reorder(fromIdx, idx);
                  setDragId(null);
                }}
                className="flex items-center gap-2 rounded-xl border p-2.5" style={{ borderColor: "#D4A83E", background: "#FFFFFF", cursor: "grab" }}
              >
                <GripVertical style={{ width: 16, height: 16, color: "#76544A" }} />
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg" style={{ background: "#F5E8CF" }}>
                  {it.image ? (
                     
                    <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                  ) : <div className="grid h-full w-full place-items-center text-xs font-bold" style={{ color: "#641C27" }}>{it.name.charAt(0)}</div>}
                </div>
                <span className="flex-1 text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{it.name}</span>
                <button onClick={() => toggle(it.id, false)} className="grid h-7 w-7 place-items-center rounded-full" style={{ background: "#F5E8CF" }}><X style={{ width: 12, height: 12, color: "#641C27" }} /></button>
              </div>
            ))}
            {featured.length === 0 && <p className="text-xs" style={{ color: "#76544A" }}>No featured items yet.</p>}
          </div>
        </div>

        {/* Available to feature */}
        <div>
          <h2 className="mb-2 text-sm font-semibold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>Available ({available.length})</h2>
          <div className="max-h-96 space-y-2 overflow-y-auto fancy-scroll">
            {available.map((it) => (
              <div key={it.id} className="flex items-center gap-2 rounded-xl border p-2.5" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg" style={{ background: "#F5E8CF" }}>
                  {it.image ? (
                     
                    <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                  ) : <div className="grid h-full w-full place-items-center text-xs font-bold" style={{ color: "#641C27" }}>{it.name.charAt(0)}</div>}
                </div>
                <span className="flex-1 text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{it.name}</span>
                <button onClick={() => toggle(it.id, true)} className="grid h-7 w-7 place-items-center rounded-full" style={{ background: "#641C27" }}><Star style={{ width: 12, height: 12, color: "#E5B84B" }} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
