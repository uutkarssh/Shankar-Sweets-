"use client";

import { useState } from "react";
import { useCart } from "@/lib/store";
import { BUSINESS, calculateDeliveryFee, formatINR, haversineKm } from "@/lib/constants";
import { Crosshair, MapPin, Navigation, Plus, Minus, Check } from "lucide-react";
import { toast } from "sonner";

export function AddressPicker() {
  const address = useCart((s) => s.address);
  const setAddress = useCart((s) => s.setAddress);
  const subtotal = useCart((s) => s.subtotal());

  const [label, setLabel] = useState(address?.label ?? "Home");
  const [fullAddress, setFullAddress] = useState(address?.fullAddress ?? "");
  const [landmark, setLandmark] = useState(address?.landmark ?? "");
  const [pincode, setPincode] = useState(address?.pincode ?? "");
  const [lat, setLat] = useState<number | undefined>(address?.lat);
  const [lng, setLng] = useState<number | undefined>(address?.lng);

  const distance = lat != null && lng != null ? haversineKm(BUSINESS.lat, BUSINESS.lng, lat, lng) : undefined;
  const fee = distance != null ? calculateDeliveryFee(distance, subtotal) : undefined;
  const outOfRange = fee === null;

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported", { description: "Please enter coordinates manually." });
      return;
    }
    toast.info("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        toast.success("Location detected", { description: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}` });
      },
      (err) => {
        // Fallback: use shop location so user can still proceed (demo)
        toast.warning("Couldn't get GPS", { description: "Using shop location as fallback. Adjust the pin to your address." });
        setLat(BUSINESS.lat);
        setLng(BUSINESS.lng);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const save = () => {
    if (!fullAddress.trim() || !pincode.trim() || lat == null || lng == null) {
      toast.error("Fill all fields", { description: "Address, PIN code and a pin location are required." });
      return;
    }
    if (pincode.length !== 6) {
      toast.error("Invalid PIN code", { description: "PIN code must be 6 digits." });
      return;
    }
    if (outOfRange) {
      toast.error("Out of delivery range", { description: `We deliver within ${BUSINESS.deliveryRadiusKm} km only.` });
      return;
    }
    setAddress({
      label,
      fullAddress,
      landmark: landmark || undefined,
      pincode,
      lat,
      lng,
      distanceKm: distance,
    });
    toast.success("Address saved", { description: fee === 0 ? "Free delivery applied!" : `Delivery fee: ${formatINR(fee ?? 0)}` });
  };

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
      <div className="flex items-center gap-2">
        <MapPin style={{ width: 16, height: 16, color: "#D4A83E" }} />
        <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Delivery Address</h3>
      </div>

      {/* Label chips */}
      <div className="mt-3 flex gap-2">
        {["Home", "Work", "Other"].map((t) => (
          <button key={t} onClick={() => setLabel(t)} className="rounded-lg border px-3 py-1 text-xs font-semibold transition" style={{ borderColor: label === t ? "#641C27" : "#E8D9B8", background: label === t ? "#641C27" : "#FFF8E8", color: label === t ? "#FFF8E8" : "#641C27" }}>{t}</button>
        ))}
      </div>

      {/* Map mock with draggable pin */}
      <div className="relative mt-3 h-44 overflow-hidden rounded-xl border" style={{ borderColor: "#E8D9B8", background: "linear-gradient(135deg,#F5E8CF,#FFF8E8)" }}>
        <MapCanvas lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
        <button onClick={useCurrentLocation} className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold shadow" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
          <Crosshair style={{ width: 12, height: 12, color: "#E5B84B" }} /> Use Current Location
        </button>
        {distance != null && (
          <div className="absolute bottom-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-bold shadow" style={{ background: "#3D1018", color: "#FFF8E8" }}>
            <Navigation style={{ width: 10, height: 10, display: "inline", marginRight: 4, color: "#E5B84B" }} />
            {distance.toFixed(2)} km from shop
          </div>
        )}
      </div>
      {lat == null && <p className="mt-1.5 text-[11px]" style={{ color: "#76544A" }}>Tap "Use Current Location" or drag the pin to set your address.</p>}
      {outOfRange && <p className="mt-1.5 text-[11px] font-semibold text-red-600">Beyond {BUSINESS.deliveryRadiusKm} km — delivery not available here.</p>}

      <div className="mt-3 space-y-2">
        <Field label="Full Address" value={fullAddress} onChange={setFullAddress} placeholder="House no, street, area" multiline />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Landmark" value={landmark} onChange={setLandmark} placeholder="Near..." />
          <Field label="PIN Code" value={pincode} onChange={(v) => setPincode(v.replace(/\D/g, "").slice(0, 6))} placeholder="6 digits" />
        </div>
      </div>

      {fee !== undefined && !outOfRange && (
        <div className="mt-3 rounded-xl px-3 py-2 text-xs" style={{ background: fee === 0 ? "#E8F5E9" : "#F5E8CF", color: fee === 0 ? "#2F6B45" : "#641C27" }}>
          {fee === 0 ? `Free delivery — order above ${formatINR(BUSINESS.freeDeliveryThreshold)}` : `Delivery fee: ${formatINR(fee)} (within ${distance?.toFixed(1)} km)`}
        </div>
      )}

      <button onClick={save} className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
        <Check style={{ width: 14, height: 14, display: "inline", marginRight: 6, color: "#E5B84B" }} /> Save Address
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
      )}
    </label>
  );
}

/** A lightweight self-contained map: draggable pin on a gridded canvas. Avoids external tile dependencies. */
function MapCanvas({ lat, lng, onChange }: { lat?: number; lng?: number; onChange: (lat: number, lng: number) => void }) {
  // Pin position in fractional coords 0..1; defaults to shop location
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [dragging, setDragging] = useState(false);

  const apply = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    setPos({ x, y });
    // Map pin position to a small delta around the shop (±0.03 deg ≈ ±3km)
    const newLat = BUSINESS.lat + (0.5 - y) * 0.06;
    const newLng = BUSINESS.lng + (x - 0.5) * 0.06;
    onChange(newLat, newLng);
  };

  return (
    <div
      className="relative h-full w-full"
      style={{ backgroundImage: "linear-gradient(rgba(100,28,39,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(100,28,39,0.08) 1px,transparent 1px)", backgroundSize: "28px 28px" }}
      onPointerDown={(e) => { setDragging(true); (e.target as HTMLElement).setPointerCapture(e.pointerId); const rect = e.currentTarget.getBoundingClientRect(); apply(e.clientX, e.clientY, rect); }}
      onPointerMove={(e) => { if (!dragging) return; const rect = e.currentTarget.getBoundingClientRect(); apply(e.clientX, e.clientY, rect); }}
      onPointerUp={() => setDragging(false)}
      role="application"
      aria-label="Draggable map pin"
    >
      {/* Shop marker */}
      <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
        <div className="grid h-6 w-6 place-items-center rounded-full" style={{ background: "#641C27", border: "2px solid #D4A83E" }}>
          <span style={{ fontSize: 9, color: "#E5B84B", fontWeight: 700 }}>S</span>
        </div>
      </div>
      {/* Draggable pin */}
      <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, cursor: dragging ? "grabbing" : "grab" }}>
        <MapPin style={{ width: 28, height: 28, color: "#641C27", fill: "#E5B84B" }} strokeWidth={2} />
      </div>
      <span className="absolute bottom-1.5 right-2 text-[9px]" style={{ color: "#76544A" }}>Drag pin · S = shop</span>
    </div>
  );
}
