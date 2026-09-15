"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useEffect, useState } from "react";
import { Sparkles, Plus, Pencil, Trash2, X, Power, Tag, Check, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/constants";

type ComboItem = {
  itemId: string;
  name: string;
  price: number;
  active: boolean;
};

type Combo = {
  id: string;
  title: string;
  subtitle: string | null;
  comboPrice: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  items: ComboItem[];
};

type MenuItem = {
  id: string;
  name: string;
  price: number;
  priceSmall: number | null;
  priceFull: number | null;
  variantType: string;
  category: { name: string };
  active: boolean;
};

// Pick the right price field based on variantType — matches the homepage logic.
function itemPrice(it: { price: number; priceSmall: number | null; priceFull: number | null; variantType: string }): number {
  if (it.variantType === "size" && it.priceSmall && it.priceSmall > 0) return it.priceSmall;
  if (it.variantType === "portion" && it.priceFull && it.priceFull > 0) return it.priceFull;
  return it.price;
}

export default function AdminCombosPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Combo | null>(null);

  const load = async () => {
    try {
      const [combosRes, menuRes] = await Promise.all([
        fetch("/api/admin/combos", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/menu", { credentials: "include", cache: "no-store" }),
      ]);
      if (combosRes.ok) {
        const d = await combosRes.json();
        setCombos(d.combos || []);
      }
      if (menuRes.ok) {
        const d = await menuRes.json();
        // Flatten categories → items
        const flat: MenuItem[] = (d.categories || []).flatMap((c: any) =>
          (c.items || []).map((it: any) => ({
            id: it.id,
            name: it.name,
            price: it.price,
            priceSmall: it.priceSmall,
            priceFull: it.priceFull,
            variantType: it.variantType || "single",
            category: { name: c.name },
            active: it.active,
          }))
        );
        setMenuItems(flat);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (data: any) => {
    const res = await fetch("/api/admin/combos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.success(editing ? "Combo updated" : "Combo created");
      setShowForm(false);
      setEditing(null);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Save failed");
    }
  };

  const toggle = async (id: string) => {
    const res = await fetch("/api/admin/combos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id }),
    });
    if (res.ok) { toast.success("Toggled"); load(); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this combo? This cannot be undone.")) return;
    const res = await fetch("/api/admin/combos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (res.ok) { toast.success("Combo deleted"); load(); }
    else toast.error("Delete failed");
  };

  const move = async (combo: Combo, direction: "up" | "down") => {
    const sorted = [...combos].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((c) => c.id === combo.id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;
    const swapWith = direction === "up" ? sorted[idx - 1] : sorted[idx + 1];
    // Swap sortOrder values
    await fetch("/api/admin/combos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder",
        order: [
          { id: combo.id, sortOrder: swapWith.sortOrder },
          { id: swapWith.id, sortOrder: combo.sortOrder },
        ],
      }),
    });
    load();
  };

  return (
    <AdminShell>
      <div className="rounded-2xl border p-4 sm:p-6" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-full" style={{ background: "#D4A83E" }} />
            <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>
              Combo Deals
            </h1>
            <Sparkles style={{ width: 18, height: 18, color: "#E5B84B" }} />
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide"
            style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
          >
            <Plus style={{ width: 14, height: 14 }} /> New Combo
          </button>
        </div>
        <p className="mt-2 text-xs" style={{ color: "#76544A" }}>
          Combo deals appear on the homepage. The discount badge is auto-calculated from (original total − combo price).
          If any item in a combo is deleted or deactivated, the combo is hidden from the homepage until you edit it.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <div className="shimmer mx-auto h-8 w-8 rounded-full" />
            <p className="mt-3 text-sm" style={{ color: "#76544A" }}>Loading combos...</p>
          </div>
        ) : combos.length === 0 ? (
          <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <p className="text-sm font-semibold" style={{ color: "#641C27" }}>No combos yet</p>
            <p className="mt-1 text-xs" style={{ color: "#76544A" }}>Click &ldquo;New Combo&rdquo; to create your first combo deal.</p>
          </div>
        ) : (
          combos.map((c) => {
            const originalTotal = c.items.reduce((s, it) => s + it.price, 0);
            const savings = originalTotal - c.comboPrice;
            const savingsPercent = originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;
            const hasDeletedItems = c.items.some((it) => !it.active || it.name === "[deleted item]");
            return (
              <div key={c.id} className="rounded-2xl border p-4" style={{ borderColor: hasDeletedItems ? "#B91C1C" : "#E8D9B8", background: "#FFFFFF" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
                        {c.title}
                      </h3>
                      {c.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: "#D1FAE5", color: "#2F6B45" }}>
                          <Check style={{ width: 8, height: 8 }} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: "#FEE2E2", color: "#B91C1C" }}>
                          Hidden
                        </span>
                      )}
                      {hasDeletedItems && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: "#FEE2E2", color: "#B91C1C" }}>
                          ⚠ Has deleted item
                        </span>
                      )}
                    </div>
                    {c.subtitle && <p className="mt-0.5 text-xs" style={{ color: "#76544A" }}>{c.subtitle}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => move(c, "up")} disabled={c.sortOrder === 0} className="grid h-7 w-7 place-items-center rounded-full disabled:opacity-30" style={{ background: "#F5E8CF" }} aria-label="Move up">
                      <ArrowUp style={{ width: 12, height: 12, color: "#641C27" }} />
                    </button>
                    <button onClick={() => move(c, "down")} disabled={c.sortOrder === combos.length - 1} className="grid h-7 w-7 place-items-center rounded-full disabled:opacity-30" style={{ background: "#F5E8CF" }} aria-label="Move down">
                      <ArrowDown style={{ width: 12, height: 12, color: "#641C27" }} />
                    </button>
                    <button onClick={() => toggle(c.id)} className="grid h-7 w-7 place-items-center rounded-full" style={{ background: "#F5E8CF" }} aria-label="Toggle active">
                      <Power style={{ width: 12, height: 12, color: c.active ? "#2F6B45" : "#B91C1C" }} />
                    </button>
                    <button onClick={() => { setEditing(c); setShowForm(true); }} className="grid h-7 w-7 place-items-center rounded-full" style={{ background: "#F5E8CF" }} aria-label="Edit">
                      <Pencil style={{ width: 12, height: 12, color: "#641C27" }} />
                    </button>
                    <button onClick={() => del(c.id)} className="grid h-7 w-7 place-items-center rounded-full" style={{ background: "#FEE2E2" }} aria-label="Delete">
                      <Trash2 style={{ width: 12, height: 12, color: "#B91C1C" }} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {c.items.map((it, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: it.active ? "#FFF8E8" : "#FEE2E2", color: it.active ? "#3D1018" : "#B91C1C", border: `1px solid ${it.active ? "#E8D9B8" : "#FCA5A5"}` }}>
                      {it.name} {it.active ? `· ${formatINR(it.price)}` : "(inactive)"}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Original</span>
                    <span className="ml-1 line-through" style={{ color: "#76544A" }}>{formatINR(originalTotal)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Combo</span>
                    <span className="ml-1 font-bold" style={{ color: "#641C27" }}>{formatINR(c.comboPrice)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Discount</span>
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: "linear-gradient(90deg,#D4A83E,#E5B84B)", color: "#3D1018" }}>
                      <Tag style={{ width: 8, height: 8 }} /> {savingsPercent}% OFF
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Save</span>
                    <span className="ml-1 font-bold" style={{ color: "#2F6B45" }}>{formatINR(savings)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <ComboForm
          combo={editing}
          menuItems={menuItems}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={save}
        />
      )}
    </AdminShell>
  );
}

function ComboForm({
  combo,
  menuItems,
  onClose,
  onSave,
}: {
  combo: Combo | null;
  menuItems: MenuItem[];
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [title, setTitle] = useState(combo?.title || "");
  const [subtitle, setSubtitle] = useState(combo?.subtitle || "");
  const [comboPrice, setComboPrice] = useState(combo ? String(combo.comboPrice) : "");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(combo?.items.map((it) => it.itemId) || []);
  const [active, setActive] = useState(combo ? combo.active : true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredItems = menuItems.filter((it) =>
    !search || it.name.toLowerCase().includes(search.toLowerCase()) || it.category.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectedItems = selectedItemIds
    .map((id) => menuItems.find((it) => it.id === id))
    .filter((x): x is MenuItem => !!x);

  const originalTotal = selectedItems.reduce((s, it) => s + itemPrice(it), 0);
  const comboPriceNum = Number(comboPrice) || 0;
  const savings = originalTotal - comboPriceNum;
  const savingsPercent = originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (selectedItemIds.length === 0) { toast.error("Select at least one item"); return; }
    if (!comboPrice || comboPriceNum < 0) { toast.error("Enter a valid combo price"); return; }
    setSaving(true);
    const payload: any = {
      action: combo ? "update" : "create",
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      comboPrice: comboPriceNum,
      itemIds: selectedItemIds,
      active,
    };
    if (combo) payload.id = combo.id;
    onSave(payload);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-3xl border" style={{ background: "#FFF8E8", borderColor: "#D4A83E" }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4" style={{ background: "#641C27", borderColor: "#D4A83E" }}>
          <h2 className="text-base font-bold" style={{ color: "#FFF8E8", fontFamily: "var(--font-poppins)" }}>
            {combo ? "Edit Combo" : "New Combo"}
          </h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <X style={{ width: 16, height: 16, color: "#FFF8E8" }} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          {/* Title + subtitle */}
          <div>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Combo Title *</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Pizza & Chai Combo"
                required
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }}
              />
            </label>
            <label className="mt-3 block">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Subtitle</span>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. A perfect evening treat"
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }}
              />
            </label>
          </div>

          {/* Combo price */}
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Combo Price (₹) *</span>
            <input
              type="number"
              value={comboPrice}
              onChange={(e) => setComboPrice(e.target.value)}
              placeholder="e.g. 89"
              required
              min="0"
              step="1"
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
              style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }}
            />
          </label>

          {/* Live discount preview */}
          {selectedItems.length > 0 && comboPrice && (
            <div className="rounded-xl border p-3 text-xs" style={{ borderColor: "#D4A83E", background: "#FFFFFF" }}>
              <div className="flex items-center justify-between gap-3">
                <span style={{ color: "#76544A" }}>Original total (sum of items)</span>
                <span className="line-through" style={{ color: "#76544A" }}>{formatINR(originalTotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span style={{ color: "#76544A" }}>Combo price</span>
                <span className="font-bold" style={{ color: "#641C27" }}>{formatINR(comboPriceNum)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 border-t pt-2" style={{ borderColor: "#E8D9B8" }}>
                <span className="font-semibold" style={{ color: "#3D1018" }}>Customer saves</span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: "linear-gradient(90deg,#D4A83E,#E5B84B)", color: "#3D1018" }}>
                    <Tag style={{ width: 8, height: 8 }} /> {savingsPercent}% OFF
                  </span>
                  <span className="font-bold" style={{ color: "#2F6B45" }}>{formatINR(savings)}</span>
                </span>
              </div>
            </div>
          )}

          {/* Item picker */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Items in Combo * ({selectedItemIds.length} selected)</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items by name or category..."
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }}
            />
            <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              {filteredItems.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs" style={{ color: "#76544A" }}>No items found</p>
              ) : (
                filteredItems.map((it) => {
                  const selected = selectedItemIds.includes(it.id);
                  const price = itemPrice(it);
                  return (
                    <label
                      key={it.id}
                      className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 last:border-b-0 hover:bg-[#FFF8E8]"
                      style={{ borderColor: "#F5E8CF", background: selected ? "#FFF8E8" : "transparent" }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleItem(it.id)}
                        className="h-4 w-4 accent-[#641C27]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold" style={{ color: it.active ? "#3D1018" : "#B91C1C" }}>
                          {it.name} {!it.active && <span className="text-[9px]">(inactive)</span>}
                        </div>
                        <div className="text-[10px]" style={{ color: "#76544A" }}>{it.category.name}</div>
                      </div>
                      <span className="text-xs font-bold" style={{ color: "#641C27" }}>{formatINR(price)}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[#641C27]" />
            <span className="text-xs font-semibold" style={{ color: "#3D1018" }}>Active (show on homepage)</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border py-3 text-sm font-bold uppercase tracking-wide"
              style={{ borderColor: "#E8D9B8", color: "#76544A", background: "#FFFFFF" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-50"
              style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
            >
              {saving ? "Saving..." : combo ? "Save Changes" : "Create Combo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
