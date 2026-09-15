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
  pricePer250: number | null; pricePer500: number | null; pricePerKg: number | null;
  weightBased: boolean; variantType: string; image: string | null;
  featured: boolean; bestSeller: boolean; veg: boolean; inStock: boolean; sortOrder: number;
};

/**
 * Build a price display string for an item based on its variant type.
 * - single/count: just the base price (e.g. "₹50")
 * - size: "Small ₹80 · Large ₹120"
 * - portion: "Half ₹35 · Full ₹60"
 * - weight: "250g ₹50 · 500g ₹90 · 1kg ₹170"
 * Falls back to base price if variant-specific prices are missing/0.
 */
function getPriceDisplay(it: Item): string {
  const base = formatINR(it.price);
  switch (it.variantType) {
    case "size": {
      const s = it.priceSmall && it.priceSmall > 0 ? formatINR(it.priceSmall) : base;
      const l = it.priceLarge && it.priceLarge > 0 ? formatINR(it.priceLarge) : base;
      return `Small ${s} · Large ${l}`;
    }
    case "portion": {
      const h = it.priceHalf && it.priceHalf > 0 ? formatINR(it.priceHalf) : base;
      const f = it.priceFull && it.priceFull > 0 ? formatINR(it.priceFull) : base;
      return `Half ${h} · Full ${f}`;
    }
    case "weight": {
      const p250 = it.pricePer250 && it.pricePer250 > 0 ? formatINR(it.pricePer250) : base;
      const p500 = it.pricePer500 && it.pricePer500 > 0 ? formatINR(it.pricePer500) : base;
      const p1kg = it.pricePerKg && it.pricePerKg > 0 ? formatINR(it.pricePerKg) : base;
      return `250g ${p250} · 500g ${p500} · 1kg ${p1kg}`;
    }
    default:
      return base;
  }
}

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/menu", { credentials: "include", cache: "no-store" });
      const d = await res.json();
      setCategories(d.categories || []);
      if (!activeCat && d.categories?.[0]) setActiveCat(d.categories[0].id);
      setItems((d.categories || []).flatMap((c: any) => c.items || []));
    } catch {
      // ignore
    }
  };
   
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
    const res = await fetch("/api/admin/menu", { credentials: "include", method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-item", id }) });
    if (res.ok) { toast.success("Deleted"); load(); }
  };

  const saveCat = async (data: any) => {
    const res = await fetch("/api/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.success(editingCat ? "Category updated" : "Category created");
      setShowCatForm(false);
      setEditingCat(null);
      load();
    } else {
      toast.error("Save failed");
    }
  };

  const delCat = async (id: string) => {
    if (!confirm("Delete this category? Items in it will also be deleted.")) return;
    const res = await fetch("/api/admin/menu", { credentials: "include", method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-category", id }) });
    if (res.ok) { toast.success("Category deleted"); load(); }
    else toast.error("Delete failed — category may have items. Remove items first.");
  };

  return (
    <AdminShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Menu Management</h1>
          <div className="gold-divider mt-2"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditingCat(null); setShowCatForm(true); }} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide" style={{ background: "#F5E8CF", color: "#641C27", border: "1px solid #E8D9B8" }}>
            <Plus style={{ width: 14, height: 14 }} /> Add Category
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
            <Plus style={{ width: 14, height: 14, color: "#E5B84B" }} /> Add Item
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setActiveCat("")} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: activeCat === "" ? "#641C27" : "#F5E8CF", color: activeCat === "" ? "#FFF8E8" : "#641C27", border: `1px solid ${activeCat === "" ? "#641C27" : "#E8D9B8"}` }}>All</button>
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-0">
            <button onClick={() => setActiveCat(c.id)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: activeCat === c.id ? "#641C27" : "#F5E8CF", color: activeCat === c.id ? "#FFF8E8" : "#641C27", border: `1px solid ${activeCat === c.id ? "#641C27" : "#E8D9B8"}` }}>
              {c.icon && <img src={c.icon} alt="" className="h-4 w-4 rounded-full object-cover" />}
              {c.name}
            </button>
            <button onClick={() => { setEditingCat(c); setShowCatForm(true); }} className="grid h-6 w-6 place-items-center rounded-full ml-0.5" style={{ background: "#F5E8CF", border: "1px solid #E8D9B8" }} aria-label={`Edit ${c.name}`}>
              <Pencil style={{ width: 9, height: 9, color: "#641C27" }} />
            </button>
          </div>
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
                <div className="mt-1 text-xs font-bold leading-snug" style={{ color: "#641C27" }}>{getPriceDisplay(it)}</div>
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

      {showCatForm && (
        <CategoryForm category={editingCat} onClose={() => { setShowCatForm(false); setEditingCat(null); }} onSave={saveCat} onDelete={delCat} />
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
    pricePer250: (item as any)?.pricePer250 ?? "",
    pricePer500: (item as any)?.pricePer500 ?? "",
    pricePerKg: (item as any)?.pricePerKg ?? "",
    weightBased: item?.weightBased ?? false,
    variantType: item?.variantType || "single",
    image: item?.image || "",
    images: (() => {
      try { return item?.images ? JSON.parse(item.images) : []; } catch { return []; }
    })(),
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
              <select
                value={f.variantType}
                onChange={(e) => {
                  const vt = e.target.value;
                  // Auto-set weightBased flag to match the variant type
                  set("variantType", vt);
                  set("weightBased", vt === "weight");
                }}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }}
              >
                <option value="single">Single</option>
                <option value="size">Size (Small/Large)</option>
                <option value="portion">Portion (Half/Full)</option>
                <option value="count">Count (per piece)</option>
                <option value="weight">Weight (250g/500g/1kg)</option>
              </select>
            </label>
          </div>
          {/* Base Price — only show for "single" and "count" variant types.
              For "size" (Small/Large), "portion" (Half/Full), and "weight"
              (250g/500g/1kg), the admin only enters the variant-specific
              prices, so the Base Price field is hidden. */}
          {(f.variantType === "single" || f.variantType === "count") && (
            <Input label="Base Price (INR)" value={f.price} onChange={(v) => set("price", v)} type="number" />
          )}
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
          {f.variantType === "weight" && (
            <div className="grid grid-cols-3 gap-2">
              <Input label="250g Price" value={f.pricePer250} onChange={(v) => set("pricePer250", v)} type="number" />
              <Input label="500g Price" value={f.pricePer500} onChange={(v) => set("pricePer500", v)} type="number" />
              <Input label="1kg Price" value={f.pricePerKg} onChange={(v) => set("pricePerKg", v)} type="number" />
            </div>
          )}
          <ImageUploadField value={f.image} onChange={(v) => set("image", v)} />
          <MultiImageField
            images={f.images || []}
            onChange={(imgs) => set("images", imgs)}
          />
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
          credentials: "include",
          body: JSON.stringify({ image: base64, fileName, contentType: ct }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          onChange(data.url);
          toast.success("Image uploaded to Supabase Storage");
        } else {
          setError(data.error || "Upload failed");
          toast.error("Upload failed — " + (data.error || "unknown error"));
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
        <div className="flex-1">
          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-2 text-xs font-semibold transition hover:bg-white" style={{ borderColor: "#D4A83E", color: "#641C27", background: "#FFFFFF" }}>
            {uploading ? "Uploading..." : "Upload Image"}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }} />
          </label>
        </div>
      </div>
      {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}
      <p className="mt-1 text-[9px]" style={{ color: "#76544A" }}>Uploads to Supabase Storage (menu-images bucket). Max 5MB.</p>
    </div>
  );
}

function MultiImageField({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (images.length >= 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    setUploading(true);
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
          credentials: "include",
          body: JSON.stringify({ image: base64, fileName, contentType: ct }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          onChange([...images, data.url]);
          toast.success(`Image ${images.length + 1} added`);
        } else {
          toast.error("Upload failed — " + (data.error || "unknown error"));
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  const removeAt = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>
          Gallery Images ({images.length}/5)
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border" style={{ borderColor: "#E8D9B8", background: "#F5E8CF" }}>
            { }
            <img src={img} alt={`gallery ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-bl-lg rounded-tr-xl text-white"
              style={{ background: "#B91C1C" }}
              aria-label={`Remove image ${i + 1}`}
            >
              <X style={{ width: 11, height: 11 }} />
            </button>
            <span className="absolute bottom-0 left-0 rounded-tr px-1 text-[8px] font-bold text-white" style={{ background: "#641C27" }}>
              {i + 1}
            </span>
          </div>
        ))}
        {images.length < 5 && (
          <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center" style={{ borderColor: "#D4A83E", color: "#641C27", background: "#FFFFFF" }}>
            {uploading ? (
              <span className="text-[9px] font-semibold">Uploading...</span>
            ) : (
              <>
                <Plus style={{ width: 16, height: 16 }} />
                <span className="text-[8px] font-semibold">Add</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }} />
          </label>
        )}
      </div>
      <p className="mt-1 text-[9px]" style={{ color: "#76544A" }}>Up to 5 images. First image is the cover. Shown as a carousel on the item page.</p>
    </div>
  );
}

// ─── Category Form — add/edit/delete categories with icon upload ───
function CategoryForm({ category, onClose, onSave, onDelete }: { category: Category | null; onClose: () => void; onSave: (d: any) => void; onDelete: (id: string) => void }) {
  const [f, setF] = useState<any>({
    action: category ? "update-category" : "create-category",
    id: category?.id,
    name: category?.name || "",
    slug: category?.slug || "",
    icon: category?.icon || "",
    sortOrder: category?.sortOrder ?? 0,
    active: category?.active ?? true,
  });
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 fancy-scroll sm:rounded-3xl" style={{ background: "#FFF8E8" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{category ? "Edit Category" : "New Category"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "#F5E8CF" }}><X style={{ width: 16, height: 16, color: "#641C27" }} /></button>
        </div>
        <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

        <div className="space-y-3">
          <Input label="Category Name" value={f.name} onChange={(v) => set("name", v)} placeholder="e.g. Pizza, Bakery, Ice Cream" />
          <Input label="Slug (optional — auto-generated from name)" value={f.slug} onChange={(v) => set("slug", v)} placeholder="e.g. pizza, bakery, ice-cream" />

          {/* Icon image upload */}
          <CategoryIconUpload value={f.icon} onChange={(v) => set("icon", v)} />

          <Input label="Sort Order (lower = appears first)" value={f.sortOrder} onChange={(v) => set("sortOrder", v)} type="number" />

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[#641C27]" />
            <span className="text-xs font-semibold" style={{ color: "#3D1018" }}>Active (visible to customers)</span>
          </label>

          <div className="flex gap-2 pt-2">
            {category && (
              <button
                onClick={() => { onDelete(category.id); onClose(); }}
                className="flex-1 rounded-xl border py-2.5 text-sm font-bold uppercase tracking-wide text-red-600"
                style={{ borderColor: "#FECACA", background: "#FEE2E2" }}
              >
                <Trash2 style={{ width: 14, height: 14, display: "inline" }} /> Delete
              </button>
            )}
            <button
              onClick={() => onSave(f)}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold uppercase tracking-wide"
              style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
            >
              {category ? "Update Category" : "Create Category"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryIconUpload({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
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
          credentials: "include",
          body: JSON.stringify({ image: base64, fileName, contentType: ct }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          onChange(data.url);
          toast.success("Category icon uploaded");
        } else {
          toast.error("Upload failed");
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      toast.error("Upload failed");
    }
  };

  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Category Icon (optional)</span>
      <div className="mt-1 flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border" style={{ background: "#F5E8CF", borderColor: "#E8D9B8" }}>
          {value ? (
            <img src={value} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-[10px] font-semibold" style={{ color: "#76544A" }}>No icon</div>
          )}
        </div>
        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
            className="hidden"
            id="cat-icon-upload"
          />
          <label htmlFor="cat-icon-upload" className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: "#D4A83E", background: "#FFFFFF", color: "#641C27" }}>
            {uploading ? "Uploading..." : "Upload Icon"}
          </label>
          {value && (
            <button onClick={() => onChange("")} className="ml-2 text-xs font-bold text-red-600">Remove</button>
          )}
          <p className="mt-1 text-[9px]" style={{ color: "#76544A" }}>Shown next to the category name on the homepage & menu.</p>
        </div>
      </div>
    </div>
  );
}
