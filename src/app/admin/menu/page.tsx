"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Star } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/constants";

type Category = { id: string; name: string; slug: string; icon: string | null; sortOrder: number; active: boolean };
type Item = {
  id: string; name: string; description: string | null; categoryId: string;
  price: number; priceSmall: number | null; priceLarge: number | null; priceHalf: number | null; priceFull: number | null;
  weightBased: boolean; variantType: string; image: string | null;
  featured: boolean; bestSeller: boolean; veg: boolean; inStock: boolean; sortOrder: number;
};

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/menu", { cache: "no-store" });
      const d = await res.json();
      setCategories(d.categories || []);
      if (!activeCat && d.categories?.[0]) setActiveCat(d.categories[0].id);
      setItems((d.categories || []).flatMap((c: any) => c.items || []));
    } catch {
      // ignore
    }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  const visibleItems = items.filter((i) => !activeCat || i.categoryId === activeCat);

  const save = async (data: any) => {
    const res = await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.success(editing ? "Item updated" : "Item created");
      setShowForm(false);
      setEditing(null);
      load();
    } else {
      toast.error("Save failed");
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const res = await fetch("/api/admin/menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-item", id }) });
    if (res.ok) { toast.success("Deleted"); load(); }
  };

  return (
    <AdminShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Menu Management</h1>
          <div className="gold-divider mt-2"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
          <Plus style={{ width: 14, height: 14, color: "#E5B84B" }} /> Add Item
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setActiveCat("")} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: activeCat === "" ? "#641C27" : "#F5E8CF", color: activeCat === "" ? "#FFF8E8" : "#641C27", border: `1px solid ${activeCat === "" ? "#641C27" : "#E8D9B8"}` }}>All</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: activeCat === c.id ? "#641C27" : "#F5E8CF", color: activeCat === c.id ? "#FFF8E8" : "#641C27", border: `1px solid ${activeCat === c.id ? "#641C27" : "#E8D9B8"}` }}>{c.name}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((it) => (
          <div key={it.id} className="rounded-2xl border p-3" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <div className="flex gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl" style={{ background: "#F5E8CF" }}>
                {it.image ? (
                   
                  <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xl font-bold" style={{ color: "#641C27" }}>{it.name.charAt(0)}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="veg-dot" style={{ width: 10, height: 10 }} />
                  <h3 className="line-clamp-1 text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{it.name}</h3>
                  {it.featured && <Star className="fill-current" style={{ width: 12, height: 12, color: "#E5B84B" }} />}
                  {it.bestSeller && <span className="rounded-full px-1.5 text-[8px] font-bold" style={{ background: "#D4A83E", color: "#3D1018" }}>BEST</span>}
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px]" style={{ color: "#76544A" }}>{it.description || "—"}</p>
                <div className="mt-1 text-sm font-bold" style={{ color: "#641C27" }}>{formatINR(it.price)}</div>
                {!it.inStock && <span className="text-[9px] font-bold text-red-600">OUT OF STOCK</span>}
              </div>
            </div>
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => { setEditing(it); setShowForm(true); }} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold" style={{ borderColor: "#E8D9B8", background: "#F5E8CF", color: "#641C27" }}>
                <Pencil style={{ width: 11, height: 11 }} /> Edit
              </button>
              <button onClick={() => del(it.id)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold text-red-600" style={{ borderColor: "#FECACA", background: "#FEE2E2" }}>
                <Trash2 style={{ width: 11, height: 11 }} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <ItemForm item={editing} categories={categories} onClose={() => { setShowForm(false); setEditing(null); }} onSave={save} />
      )}
    </AdminShell>
  );
}

function ItemForm({ item, categories, onClose, onSave }: { item: Item | null; categories: Category[]; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState<any>({
    action: item ? "update-item" : "create-item",
    id: item?.id,
    name: item?.name || "",
    description: item?.description || "",
    categoryId: item?.categoryId || categories[0]?.id || "",
    price: item?.price ?? "",
    priceSmall: item?.priceSmall ?? "",
    priceLarge: item?.priceLarge ?? "",
    priceHalf: item?.priceHalf ?? "",
    priceFull: item?.priceFull ?? "",
    variantType: item?.variantType || "single",
    image: item?.image || "",
    veg: item?.veg ?? true,
    inStock: item?.inStock ?? true,
    featured: item?.featured ?? false,
    bestSeller: item?.bestSeller ?? false,
    sortOrder: item?.sortOrder ?? 0,
  });
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 fancy-scroll sm:rounded-3xl" style={{ background: "#FFF8E8" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{item ? "Edit Item" : "New Item"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "#F5E8CF" }}><X style={{ width: 16, height: 16, color: "#641C27" }} /></button>
        </div>
        <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

        <div className="space-y-3">
          <Input label="Name" value={f.name} onChange={(v) => set("name", v)} />
          <Input label="Description" value={f.description} onChange={(v) => set("description", v)} multiline />
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Category</span>
              <select value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Variant Type</span>
              <select value={f.variantType} onChange={(e) => set("variantType", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }}>
                <option value="single">Single</option>
                <option value="size">Size (Small/Large)</option>
                <option value="portion">Portion (Half/Full)</option>
                <option value="count">Count (per piece)</option>
                <option value="weight">Weight (250g/500g/1kg)</option>
              </select>
            </label>
          </div>
          <Input label="Base Price (INR)" value={f.price} onChange={(v) => set("price", v)} type="number" />
          {f.variantType === "size" && (
            <div className="grid grid-cols-2 gap-2">
              <Input label="Small Price" value={f.priceSmall} onChange={(v) => set("priceSmall", v)} type="number" />
              <Input label="Large Price" value={f.priceLarge} onChange={(v) => set("priceLarge", v)} type="number" />
            </div>
          )}
          {f.variantType === "portion" && (
            <div className="grid grid-cols-2 gap-2">
              <Input label="Half Price" value={f.priceHalf} onChange={(v) => set("priceHalf", v)} type="number" />
              <Input label="Full Price" value={f.priceFull} onChange={(v) => set("priceFull", v)} type="number" />
            </div>
          )}
          <ImageUploadField value={f.image} onChange={(v) => set("image", v)} />
          <div className="grid grid-cols-2 gap-2">
            <Toggle label="Veg" value={f.veg} onChange={(v) => set("veg", v)} />
            <Toggle label="In Stock" value={f.inStock} onChange={(v) => set("inStock", v)} />
            <Toggle label="Featured" value={f.featured} onChange={(v) => set("featured", v)} />
            <Toggle label="Best Seller" value={f.bestSeller} onChange={(v) => set("bestSeller", v)} />
          </div>

          <button onClick={() => onSave(f)} className="w-full rounded-xl py-2.5 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
            {item ? "Update Item" : "Create Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, multiline }: { label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string; multiline?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }} />
      )}
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: value ? "#641C27" : "#E8D9B8", background: value ? "#FFF8E8" : "#FFFFFF" }}>
      <span className="text-xs font-semibold" style={{ color: "#3D1018" }}>{label}</span>
      <span className="h-4 w-7 rounded-full p-0.5 transition" style={{ background: value ? "#641C27" : "#D4A83E" }}>
        <span className="block h-3 w-3 rounded-full bg-white transition" style={{ transform: value ? "translateX(12px)" : "translateX(0)" }} />
      </span>
    </button>
  );
}

function ImageUploadField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const ct = file.type || "image/png";
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, fileName, contentType: ct }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          onChange(data.url);
          toast.success("Image uploaded to Supabase Storage");
        } else {
          setError(data.error || "Upload failed");
          toast.error("Upload failed — using local path instead");
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      setError(e.message);
      setUploading(false);
    }
  };

  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Item Image</span>
      <div className="mt-1 flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border" style={{ background: "#F5E8CF", borderColor: "#E8D9B8" }}>
          {value ? (
             
            <img src={value} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-[10px] font-semibold" style={{ color: "#76544A" }}>No image</div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-2 text-xs font-semibold transition hover:bg-white" style={{ borderColor: "#D4A83E", color: "#641C27", background: "#FFFFFF" }}>
            {uploading ? "Uploading..." : "Upload Image"}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }} />
          </label>
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="or paste image URL"
            className="w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none"
            style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }}
          />
        </div>
      </div>
      {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}
      <p className="mt-1 text-[9px]" style={{ color: "#76544A" }}>Uploads to Supabase Storage (menu-images bucket). Max 5MB.</p>
    </div>
  );
}
