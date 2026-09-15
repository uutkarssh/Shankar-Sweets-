"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/store";
import { BUSINESS, haversineKm, calculateDeliveryFee, formatINR } from "@/lib/constants";
import { ChevronLeft, MapPin, Plus, Navigation, Check, Trash2, Star, Home, Briefcase, MapPinned, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-browser";
import dynamic from "next/dynamic";

// Leaflet map must be loaded client-side only (accesses window at import)
const LeafletMap = dynamic(() => import("@/components/site/leaflet-map").then(m => ({ default: m.LeafletMap })), {
  ssr: false,
  loading: () => <div className="grid h-64 place-items-center rounded-3xl border" style={{ borderColor: "#E8D9B8", background: "#F5E8CF" }}><span className="text-sm" style={{ color: "#76544A" }}>Loading map...</span></div>,
});

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

  // Map state — pin coordinates (auto-located on mount by LeafletMap)
  const [pinLat, setPinLat] = useState<number>(BUSINESS.lat);
  const [pinLng, setPinLng] = useState<number>(BUSINESS.lng);

  // Form state
  const [label, setLabel] = useState("Home");
  const [houseFlat, setHouseFlat] = useState("");
  const [streetArea, setStreetArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [saving, setSaving] = useState(false);

  // Track auth state separately from phone number.
  // Google OAuth users don't have a phone number by default, so we need
  // to prompt them to enter one before saving an address.
  const [userPhone, setUserPhone] = useState<string>("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [accessToken, setAccessToken] = useState<string>("");
  const [phoneInput, setPhoneInput] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      setIsSignedIn(true);
      setAccessToken(session.access_token);
      try {
        const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const d = await res.json();
        if (d.profile?.phone) {
          // Extract 10-digit number from "+91 XXXXXXXXXX" format
          const digits = d.profile.phone.replace(/\D/g, "").slice(-10);
          setUserPhone(digits);
        } else {
          // Fallback to cart store phone
          const cartPhone = useCart.getState().customerPhone;
          if (cartPhone) {
            const digits = cartPhone.replace(/\D/g, "").slice(-10);
            setUserPhone(digits);
          }
          // If still no phone, user will need to enter it in the form.
          // phoneInput state handles this.
        }
      } catch {}
      setLoading(false);
    });
  }, []);

  const loadAddresses = async (phoneToUse?: string) => {
    const p = phoneToUse || userPhone;
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

  useEffect(() => { loadAddresses(); }, [userPhone]);

  const distance = pinLat != null && pinLng != null ? haversineKm(BUSINESS.lat, BUSINESS.lng, pinLat, pinLng) : 0;
  const outOfRange = distance > BUSINESS.deliveryRadiusKm;
  const fee = calculateDeliveryFee(distance, subtotal);

  const handlePinMove = (lat: number, lng: number) => {
    setPinLat(lat);
    setPinLng(lng);
  };

  const selectAddress = (a: SavedAddress) => {
    // Enforce 7km delivery radius — block selection if address is out of range
    const addrDistance = a.distanceKm != null ? a.distanceKm : haversineKm(BUSINESS.lat, BUSINESS.lng, a.lat, a.lng);
    if (addrDistance > BUSINESS.deliveryRadiusKm) {
      toast.error(`Out of delivery range`, {
        description: `This address is ${addrDistance.toFixed(2)} km away — beyond our ${BUSINESS.deliveryRadiusKm} km delivery area.`,
      });
      return;
    }
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
    router.push("/");
  };

  const saveAddress = async () => {
    if (!houseFlat.trim() || !streetArea.trim() || !city.trim() || !pincode.trim()) {
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
    // Determine which phone to use: existing profile phone, or the phone input
    const phoneToUse = userPhone || (phoneInput.replace(/\D/g, "").slice(-10));
    if (!isSignedIn) {
      toast.error("Please sign in to save addresses");
      return;
    }
    if (!phoneToUse || phoneToUse.length !== 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setSaving(true);
    try {
      // If the user didn't have a phone in their profile, save it now
      if (!userPhone && accessToken) {
        try {
          await fetch("/api/auth/me", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ phone: `+91 ${phoneToUse}` }),
          });
        } catch {
          // Non-fatal — address save can still proceed
        }
        setUserPhone(phoneToUse);
      }
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneToUse,
          label,
          houseFlat,
          streetArea,
          landmark,
          city,
          pincode,
          lat: pinLat,
          lng: pinLng,
          isDefault: true,
        }),
      });
      const d = await res.json();
      if (res.ok && d.address) {
        toast.success("Address saved");
        await loadAddresses(phoneToUse);
        selectAddress(d.address);
        setHouseFlat(""); setStreetArea(""); setLandmark(""); setCity(""); setPincode("");
      } else {
        toast.error(d.error || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Save another address — clears form but stays on page
  const saveAnotherAddress = async () => {
    if (!houseFlat.trim() || !streetArea.trim() || !city.trim() || !pincode.trim()) {
      toast.error("Fill all required fields first");
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
    const phoneToUse = userPhone || (phoneInput.replace(/\D/g, "").slice(-10));
    if (!isSignedIn) {
      toast.error("Please sign in to save addresses");
      return;
    }
    if (!phoneToUse || phoneToUse.length !== 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setSaving(true);
    try {
      if (!userPhone && accessToken) {
        try {
          await fetch("/api/auth/me", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ phone: `+91 ${phoneToUse}` }),
          });
        } catch {}
        setUserPhone(phoneToUse);
      }
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneToUse,
          label,
          houseFlat,
          streetArea,
          landmark,
          city,
          pincode,
          lat: pinLat,
          lng: pinLng,
          isDefault: false,
        }),
      });
      const d = await res.json();
      if (res.ok && d.address) {
        toast.success("Address saved — add another");
        await loadAddresses(phoneToUse);
        setHouseFlat(""); setStreetArea(""); setLandmark(""); setCity(""); setPincode("");
        setLabel("Other");
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

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("Home");
  const [editHouseFlat, setEditHouseFlat] = useState("");
  const [editStreetArea, setEditStreetArea] = useState("");
  const [editLandmark, setEditLandmark] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPincode, setEditPincode] = useState("");

  const startEdit = (a: SavedAddress) => {
    setEditingId(a.id);
    setEditLabel(a.label);
    setEditHouseFlat(a.houseFlat);
    setEditStreetArea(a.streetArea);
    setEditLandmark(a.landmark || "");
    setEditCity(a.city);
    setEditPincode(a.pincode);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editHouseFlat.trim() || !editStreetArea.trim() || !editCity.trim() || !editPincode.trim()) {
      toast.error("Fill all required fields");
      return;
    }
    const res = await fetch(`/api/addresses/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: editLabel,
        houseFlat: editHouseFlat,
        streetArea: editStreetArea,
        landmark: editLandmark,
        city: editCity,
        pincode: editPincode,
      }),
    });
    if (res.ok) {
      toast.success("Address updated");
      setEditingId(null);
      loadAddresses();
    } else {
      toast.error("Update failed");
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
          <button onClick={() => router.push("/")} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "#641C27" }}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Back to home
          </button>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>Select Delivery Location</h1>
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          {/* Leaflet Map — auto-fetches user location on mount */}
          <LeafletMap pin={[pinLat, pinLng]} onPinMove={handlePinMove} />
          {outOfRange && <p className="mt-2 text-xs font-semibold text-red-600">Beyond {BUSINESS.deliveryRadiusKm} km — delivery not available.</p>}

          {/* Saved addresses */}
          <h2 className="mb-2 mt-5 flex items-center gap-2 text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
            <MapPinned style={{ width: 14, height: 14, color: "#D4A83E" }} /> Saved Addresses
          </h2>
          {loading ? (
            <div className="space-y-2" aria-hidden>
              {[1, 2].map((i) => (
                <div key={i} className={`rounded-2xl border p-4 skeleton-delay-${i}`} style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                  <div className="flex items-center gap-3">
                    <div className="skeleton h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3 w-24" />
                      <div className="skeleton h-3 w-40" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : addresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <MapPin style={{ width: 28, height: 28, color: "#D4A83E", margin: "0 auto" }} />
              <p className="mt-1 text-sm font-semibold" style={{ color: "#641C27" }}>No saved addresses</p>
              <p className="text-xs" style={{ color: "#76544A" }}>Add one using the form below.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((a) => (
                <div key={a.id}>
                  {editingId === a.id ? (
                    <div className="rounded-2xl border p-3" style={{ borderColor: "#D4A83E", background: "#FFF8E8" }}>
                      <div className="mb-2 flex gap-1.5">
                        {["Home", "Work", "Other"].map((t) => (
                          <button key={t} onClick={() => setEditLabel(t)} className="rounded-lg border px-2 py-1 text-[10px] font-semibold" style={{ borderColor: editLabel === t ? "#641C27" : "#E8D9B8", background: editLabel === t ? "#641C27" : "#FFFFFF", color: editLabel === t ? "#FFF8E8" : "#641C27" }}>{t}</button>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <input value={editHouseFlat} onChange={(e) => setEditHouseFlat(e.target.value)} placeholder="House / Flat" className="w-full rounded-lg border px-2 py-1.5 text-xs focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }} />
                        <input value={editStreetArea} onChange={(e) => setEditStreetArea(e.target.value)} placeholder="Street / Area" className="w-full rounded-lg border px-2 py-1.5 text-xs focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }} />
                        <input value={editLandmark} onChange={(e) => setEditLandmark(e.target.value)} placeholder="Landmark" className="w-full rounded-lg border px-2 py-1.5 text-xs focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }} />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="City" className="w-full rounded-lg border px-2 py-1.5 text-xs focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }} />
                          <input value={editPincode} onChange={(e) => setEditPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="PIN" inputMode="numeric" className="w-full rounded-lg border px-2 py-1.5 text-xs focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }} />
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button onClick={saveEdit} className="flex-1 rounded-lg py-1.5 text-xs font-bold uppercase" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>Save</button>
                        <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: "#F5E8CF", color: "#641C27" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => selectAddress(a)}
                      className="flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        borderColor: selectedAddressId === a.id ? "#D4A83E" : "#E8D9B8",
                        background: selectedAddressId === a.id ? "#FFF8E8" : "#FFFFFF",
                        boxShadow: selectedAddressId === a.id ? "0 0 0 1px #D4A83E" : "none",
                      }}
                      disabled={(a.distanceKm ?? haversineKm(BUSINESS.lat, BUSINESS.lng, a.lat, a.lng)) > BUSINESS.deliveryRadiusKm}
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: "#F5E8CF" }}>
                        {a.label === "Work" ? <Briefcase style={{ width: 16, height: 16, color: "#641C27" }} /> : <Home style={{ width: 16, height: 16, color: "#641C27" }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{a.label}</span>
                          {a.isDefault && <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ background: "#D4A83E", color: "#3D1018" }}>Default</span>}
                          {a.distanceKm != null && (
                            <span className="text-[10px] font-semibold" style={{ color: a.distanceKm > BUSINESS.deliveryRadiusKm ? "#B91C1C" : "#76544A" }}>
                              {a.distanceKm.toFixed(1)} km{a.distanceKm > BUSINESS.deliveryRadiusKm ? " · Out of range" : ""}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs" style={{ color: "#3D1018" }}>{a.houseFlat}, {a.streetArea}{a.landmark ? `, ${a.landmark}` : ""}</p>
                        <p className="text-[11px]" style={{ color: "#76544A" }}>{a.city} — {a.pincode}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {selectedAddressId === a.id && <Check style={{ width: 16, height: 16, color: "#2F6B45" }} />}
                        <button onClick={(e) => { e.stopPropagation(); startEdit(a); }} className="text-[10px] font-semibold" style={{ color: "#641C27" }}>Edit</button>
                        {!a.isDefault && <button onClick={(e) => { e.stopPropagation(); setDefault(a.id); }} className="text-[10px] font-semibold" style={{ color: "#641C27" }}>Set default</button>}
                        <button onClick={(e) => { e.stopPropagation(); deleteAddress(a.id); }} className="text-[10px] font-semibold text-red-600">Delete</button>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Address form (always visible, matching Apna Baithak) */}
          <div id="address-form" className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <h2 className="mb-3 text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Address Details</h2>

            {/* Phone input — shown when signed in but no phone in profile (e.g. Google OAuth) */}
            {isSignedIn && !userPhone && (
              <div className="mb-3 rounded-lg p-2 text-[11px]" style={{ background: "#FEF3C7", color: "#92400E" }}>
                Please enter your phone number — it's required for delivery and order updates.
              </div>
            )}
            {isSignedIn && !userPhone && (
              <input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Contact Number (10 digits) *"
                inputMode="numeric"
                className="mb-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: "#D4A83E", background: "#FFF8E8", color: "#2C1715" }}
              />
            )}

            {/* Label chips */}
            <div className="mb-3 flex gap-2">
              {["Home", "Work", "Other"].map((t) => (
                <button key={t} onClick={() => setLabel(t)} className="flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition" style={{ borderColor: label === t ? "#641C27" : "#E8D9B8", background: label === t ? "#641C27" : "#FFF8E8", color: label === t ? "#FFF8E8" : "#641C27", border: `1px solid ${label === t ? "#641C27" : "#E8D9B8"}` }}>{t}</button>
              ))}
            </div>
            <div className="space-y-2">
              <input value={houseFlat} onChange={(e) => setHouseFlat(e.target.value)} placeholder="House / Flat no. *" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
              <input value={streetArea} onChange={(e) => setStreetArea(e.target.value)} placeholder="Street / Area *" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
              <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Landmark (optional)" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
              <div className="grid grid-cols-2 gap-2">
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / District *" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
                <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="PIN code *" inputMode="numeric" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
              </div>
            </div>
            {outOfRange && (
              <div className="mt-2 rounded-lg px-3 py-2 text-[11px] font-semibold text-red-600" style={{ background: "#FEE2E2" }}>
                This location is {distance.toFixed(2)} km away — outside our {BUSINESS.deliveryRadiusKm} km delivery range. Move the pin closer to proceed.
              </div>
            )}
            <div className="mt-2 rounded-lg px-3 py-2 text-[11px]" style={{ background: "#F5E8CF", color: "#641C27" }}>
              Pin location on map above: {distance.toFixed(2)} km from shop {outOfRange ? "(out of range)" : `· Fee: ${fee === 0 ? "FREE" : formatINR(fee)}`}
            </div>
            <button onClick={saveAddress} disabled={saving || outOfRange} className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold uppercase tracking-wide disabled:opacity-50" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
              {saving ? "Saving..." : "Save Address"}
            </button>
            <button onClick={saveAnotherAddress} disabled={saving || outOfRange} className="mt-2 w-full rounded-xl border-2 border-dashed py-2.5 text-sm font-bold uppercase tracking-wide disabled:opacity-50" style={{ borderColor: "#D4A83E", color: "#641C27", background: "transparent" }}>
              Save Another Address
            </button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
