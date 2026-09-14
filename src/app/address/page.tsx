"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/store";
import { BUSINESS, haversineKm, calculateDeliveryFee, formatINR } from "@/lib/constants";
import { ChevronLeft, MapPin, Plus, Navigation, Check, Trash2, Star, Home, Briefcase, MapPinned, X } from "lucide-react";
import { toast } from "sonner";

type SavedAddress = {
  id: string;
  phone: string;
  label: string;
  houseFlat: string;
  streetArea: string;
  landmark: string | null;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
  distanceKm: number | null;
  isDefault: boolean;
};

export default function AddressPage() {
  const router = useRouter();
  const selectedAddressId = useCart((s) => s.selectedAddressId);
  const setSelectedAddressId = useCart((s) => s.setSelectedAddressId);
  const setAddress = useCart((s) => s.setAddress);
  const subtotal = useCart((s) => s.subtotal());
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Map state
  const [pinLat, setPinLat] = useState<number>(BUSINESS.lat);
  const [pinLng, setPinLng] = useState<number>(BUSINESS.lng);
  const [pinPos, setPinPos] = useState({ x: 0.5, y: 0.5 });
  const [dragging, setDragging] = useState(false);

  // Form state
  const [label, setLabel] = useState("Home");
  const [houseFlat, setHouseFlat] = useState("");
  const [streetArea, setStreetArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [saving, setSaving] = useState(false);

  const phone = useCart((s) => s.customerPhone);

  const loadAddresses = async (phoneToUse?: string) => {
    const p = phoneToUse || phone;
    if (!p) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/addresses?phone=${encodeURIComponent(p)}`, { cache: "no-store" });
      const d = await res.json();
      setAddresses(d.addresses || []);
      // Auto-select default if none selected
      if (!selectedAddressId && d.addresses?.length > 0) {
        const def = d.addresses.find((a: SavedAddress) => a.isDefault) || d.addresses[0];
        selectAddress(def);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAddresses(); }, [phone]);

  const distance = pinLat != null && pinLng != null ? haversineKm(BUSINESS.lat, BUSINESS.lng, pinLat, pinLng) : 0;
  const outOfRange = distance > BUSINESS.deliveryRadiusKm;
  const fee = calculateDeliveryFee(distance, subtotal);

  const selectAddress = (a: SavedAddress) => {
    setSelectedAddressId(a.id);
    setAddress({
      id: a.id,
      label: a.label,
      fullAddress: `${a.houseFlat}, ${a.streetArea}${a.landmark ? ", " + a.landmark : ""}`,
      houseFlat: a.houseFlat,
      streetArea: a.streetArea,
      landmark: a.landmark || undefined,
      city: a.city,
      pincode: a.pincode,
      lat: a.lat,
      lng: a.lng,
      distanceKm: a.distanceKm ?? undefined,
      isDefault: a.isDefault,
    });
    toast.success(`Delivering to ${a.label}`);
    router.push("/cart");
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    toast.info("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPinLat(pos.coords.latitude);
        setPinLng(pos.coords.longitude);
        setPinPos({ x: 0.5, y: 0.5 });
        toast.success("Location detected");
      },
      () => {
        toast.warning("Couldn't get GPS — using shop location");
        setPinLat(BUSINESS.lat);
        setPinLng(BUSINESS.lng);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const applyPin = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    setPinPos({ x, y });
    const newLat = BUSINESS.lat + (0.5 - y) * 0.06;
    const newLng = BUSINESS.lng + (x - 0.5) * 0.06;
    setPinLat(newLat);
    setPinLng(newLng);
  };

  const saveAddress = async () => {
    if (!houseFlat.trim() || !streetArea.trim() || !pincode.trim()) {
      toast.error("Fill all required fields");
      return;
    }
    if (pincode.length !== 6) {
      toast.error("PIN must be 6 digits");
      return;
    }
    if (outOfRange) {
      toast.error(`Out of delivery range (${BUSINESS.deliveryRadiusKm} km max)`);
      return;
    }
    if (!phone) {
      toast.error("Enter your phone first in checkout");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          label,
          houseFlat,
          streetArea,
          landmark,
          pincode,
          lat: pinLat,
          lng: pinLng,
          isDefault: true,
        }),
      });
      const d = await res.json();
      if (res.ok && d.address) {
        toast.success("Address saved");
        await loadAddresses();
        selectAddress(d.address);
        setShowForm(false);
        setHouseFlat(""); setStreetArea(""); setLandmark(""); setPincode("");
      } else {
        toast.error(d.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      loadAddresses();
    }
  };

  const setDefault = async (id: string) => {
    const res = await fetch(`/api/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      toast.success("Set as default");
      loadAddresses();
    }
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-3xl px-3 pt-3 sm:px-4">
          <button onClick={() => router.push("/cart")} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "#641C27" }}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Back to cart
          </button>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>Select Delivery Location</h1>
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          {/* Map */}
          <div className="relative h-64 overflow-hidden rounded-3xl border" style={{ borderColor: "#E8D9B8" }}>
            <div
              className="relative h-full w-full"
              style={{ backgroundImage: "linear-gradient(rgba(100,28,39,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(100,28,39,0.08) 1px,transparent 1px)", backgroundSize: "28px 28px", background: "linear-gradient(135deg,#F5E8CF,#FFF8E8)" }}
              onPointerDown={(e) => { setDragging(true); (e.target as HTMLElement).setPointerCapture(e.pointerId); const rect = e.currentTarget.getBoundingClientRect(); applyPin(e.clientX, e.clientY, rect); }}
              onPointerMove={(e) => { if (!dragging) return; const rect = e.currentTarget.getBoundingClientRect(); applyPin(e.clientX, e.clientY, rect); }}
              onPointerUp={() => setDragging(false)}
              role="application"
              aria-label="Draggable map pin"
            >
              {/* Shop marker */}
              <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
                <div className="grid h-7 w-7 place-items-center rounded-full" style={{ background: "#641C27", border: "2px solid #D4A83E" }}>
                  <span style={{ fontSize: 10, color: "#E5B84B", fontWeight: 700 }}>S</span>
                </div>
              </div>
              {/* Draggable pin */}
              <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${pinPos.x * 100}%`, top: `${pinPos.y * 100}%`, cursor: dragging ? "grabbing" : "grab" }}>
                <MapPin style={{ width: 32, height: 32, color: "#641C27", fill: "#E5B84B" }} strokeWidth={2} />
              </div>
              <button onClick={useCurrentLocation} className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold shadow" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
                <Navigation style={{ width: 12, height: 12, color: "#E5B84B" }} /> Use Current Location
              </button>
              <div className="absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow" style={{ background: outOfRange ? "#B91C1C" : "#3D1018" }}>
                {distance.toFixed(2)} km {outOfRange ? "(out of range)" : `· Fee: ${fee === 0 ? "FREE" : formatINR(fee)}`}
              </div>
            </div>
          </div>
          {outOfRange && <p className="mt-2 text-xs font-semibold text-red-600">Beyond {BUSINESS.deliveryRadiusKm} km — delivery not available.</p>}

          {/* Saved addresses */}
          <h2 className="mb-2 mt-5 flex items-center gap-2 text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
            <MapPinned style={{ width: 14, height: 14, color: "#D4A83E" }} /> Saved Addresses
          </h2>
          {loading ? (
            <div className="shimmer h-20 rounded-2xl" />
          ) : addresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <MapPin style={{ width: 28, height: 28, color: "#D4A83E", margin: "0 auto" }} />
              <p className="mt-1 text-sm font-semibold" style={{ color: "#641C27" }}>No saved addresses</p>
              <p className="text-xs" style={{ color: "#76544A" }}>Add one using the form below.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  onClick={() => selectAddress(a)}
                  className="flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition hover:scale-[1.01]"
                  style={{
                    borderColor: selectedAddressId === a.id ? "#D4A83E" : "#E8D9B8",
                    background: selectedAddressId === a.id ? "#FFF8E8" : "#FFFFFF",
                    boxShadow: selectedAddressId === a.id ? "0 0 0 1px #D4A83E" : "none",
                  }}
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: "#F5E8CF" }}>
                    {a.label === "Work" ? <Briefcase style={{ width: 16, height: 16, color: "#641C27" }} /> : <Home style={{ width: 16, height: 16, color: "#641C27" }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{a.label}</span>
                      {a.isDefault && <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ background: "#D4A83E", color: "#3D1018" }}>Default</span>}
                      {a.distanceKm != null && <span className="text-[10px]" style={{ color: "#76544A" }}>{a.distanceKm.toFixed(1)} km</span>}
                    </div>
                    <p className="mt-0.5 text-xs" style={{ color: "#3D1018" }}>{a.houseFlat}, {a.streetArea}{a.landmark ? `, ${a.landmark}` : ""}</p>
                    <p className="text-[11px]" style={{ color: "#76544A" }}>{a.city} — {a.pincode}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {selectedAddressId === a.id && <Check style={{ width: 16, height: 16, color: "#2F6B45" }} />}
                    {!a.isDefault && <button onClick={(e) => { e.stopPropagation(); setDefault(a.id); }} className="text-[10px] font-semibold" style={{ color: "#641C27" }}>Set default</button>}
                    <button onClick={(e) => { e.stopPropagation(); deleteAddress(a.id); }} className="text-[10px] font-semibold text-red-600">Delete</button>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Add new address form */}
          <button
            onClick={() => setShowForm((s) => !s)}
            className="mt-3 w-full rounded-2xl border-2 border-dashed py-3 text-sm font-bold uppercase tracking-wide transition"
            style={{ borderColor: "#D4A83E", color: "#641C27", background: "#FFFFFF" }}
          >
            {showForm ? "Cancel" : <span className="inline-flex items-center gap-1.5"><Plus style={{ width: 14, height: 14 }} /> Add New Address</span>}
          </button>

          {showForm && (
            <div className="mt-3 rounded-2xl border p-4 animate-fade-in-up" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              {/* Label chips */}
              <div className="mb-3 flex gap-2">
                {["Home", "Work", "Other"].map((t) => (
                  <button key={t} onClick={() => setLabel(t)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: label === t ? "#641C27" : "#E8D9B8", background: label === t ? "#641C27" : "#FFF8E8", color: label === t ? "#FFF8E8" : "#641C27" }}>{t}</button>
                ))}
              </div>
              <div className="space-y-2">
                <input value={houseFlat} onChange={(e) => setHouseFlat(e.target.value)} placeholder="House / Flat no. *" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
                <input value={streetArea} onChange={(e) => setStreetArea(e.target.value)} placeholder="Street / Area *" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
                <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Landmark (optional)" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
                <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="PIN code *" inputMode="numeric" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
              </div>
              <div className="mt-2 rounded-lg px-3 py-2 text-[11px]" style={{ background: "#F5E8CF", color: "#641C27" }}>
                Pin location on map above: {distance.toFixed(2)} km from shop {outOfRange ? "(out of range)" : `· Fee: ${fee === 0 ? "FREE" : formatINR(fee)}`}
              </div>
              <button onClick={saveAddress} disabled={saving} className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold uppercase tracking-wide disabled:opacity-50" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
                {saving ? "Saving..." : "Save & Deliver Here"}
              </button>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
