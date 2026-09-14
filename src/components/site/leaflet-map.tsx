"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Navigation, MapPin } from "lucide-react";
import { BUSINESS, haversineKm, calculateDeliveryFee, formatINR } from "@/lib/constants";

// Fix default icon path for Leaflet in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom red pin icon
const pinIcon = L.divIcon({
  html: `<svg width="34" height="42" viewBox="0 0 24 24" fill="#641C27" stroke="#E5B84B" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
  iconSize: [34, 42],
  iconAnchor: [17, 42],
  className: "",
});

// Restaurant icon
const restaurantIcon = L.divIcon({
  html: `<div style="background:#3D1018;border:2px solid #D4A83E;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:#E5B84B;font-weight:bold;font-size:12px;">S</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  className: "",
});

// Recenter component — flies to pin when it moves
function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [center[0], center[1]]);
  return null;
}

// Click-to-move component
function ClickToMove({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// MapResizeHandler — calls invalidateSize on mount, on window resize, and on orientation change
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    // Call invalidateSize multiple times to catch layout settling.
    // Use requestAnimationFrame to ensure the browser has painted the
    // container's final dimensions before Leaflet recalculates.
    const raf1 = requestAnimationFrame(() => map.invalidateSize());
    const timeouts = [50, 200, 500, 1000, 2000];
    const timeoutIds: ReturnType<typeof setTimeout>[] = timeouts.map((ms) =>
      setTimeout(() => {
        requestAnimationFrame(() => map.invalidateSize());
      }, ms)
    );

    // On window resize
    const handleResize = () => {
      requestAnimationFrame(() => map.invalidateSize());
    };
    window.addEventListener("resize", handleResize);

    // On orientation change
    window.addEventListener("orientationchange", handleResize);

    // Use ResizeObserver on the map container for precise detection
    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => map.invalidateSize());
    });
    resizeObserver.observe(container);

    // Also observe the parent element — when the parent's layout changes
    // (e.g. the dynamic import finishes loading), the map needs to recalculate.
    const parent = container.parentElement;
    if (parent) {
      const parentObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => map.invalidateSize());
      });
      parentObserver.observe(parent);

      return () => {
        cancelAnimationFrame(raf1);
        timeoutIds.forEach(clearTimeout);
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleResize);
        resizeObserver.disconnect();
        parentObserver.disconnect();
      };
    }

    return () => {
      cancelAnimationFrame(raf1);
      timeoutIds.forEach(clearTimeout);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      resizeObserver.disconnect();
    };
  }, [map]);
  return null;
}

export function LeafletMap({
  pin,
  onPinMove,
}: {
  pin: [number, number];
  onPinMove: (lat: number, lng: number) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [autoLocated, setAutoLocated] = useState(false);

  const distance = haversineKm(BUSINESS.lat, BUSINESS.lng, pin[0], pin[1]);
  const outOfRange = distance > BUSINESS.deliveryRadiusKm;
  const fee = calculateDeliveryFee(distance, 0);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPinMove(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Auto-locate on mount (like Apna Baithak)
  useEffect(() => {
    if (autoLocated) return;
    setAutoLocated(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onPinMove(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Silent failure — pin stays at restaurant
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [autoLocated, onPinMove]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border"
      style={{ borderColor: "#E8D9B8", height: "16rem", minHeight: "16rem", width: "100%" }}
    >
      <MapContainer
        center={pin}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", position: "absolute", top: 0, left: 0, zIndex: 0 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        <Marker position={[BUSINESS.lat, BUSINESS.lng]} icon={restaurantIcon} />
        <Marker
          position={pin}
          icon={pinIcon}
          draggable={true}
          eventHandlers={{
            drag: (e: any) => {
              onPinMove(e.target.getLatLng().lat, e.target.getLatLng().lng);
            },
            dragend: (e: any) => {
              onPinMove(e.target.getLatLng().lat, e.target.getLatLng().lng);
            },
          }}
        />
        <Recenter center={pin} />
        <ClickToMove onMove={onPinMove} />
        <MapResizeHandler />
      </MapContainer>

      {/* Use current location button */}
      <button
        onClick={useCurrentLocation}
        className="absolute right-3 top-3 z-[1000] grid h-10 w-10 place-items-center rounded-full bg-white shadow-md transition hover:bg-gray-50"
        aria-label="Use current location"
      >
        {locating ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#641C27] border-t-transparent" />
        ) : (
          <Navigation style={{ width: 18, height: 18, color: "#641C27" }} />
        )}
      </button>

      {/* Live distance badge */}
      <div
        className="absolute inset-x-3 bottom-3 z-[1000] flex items-center justify-between rounded-full px-3 py-1.5 text-xs font-bold text-white shadow"
        style={{ background: outOfRange ? "#B91C1C" : "#3D1018" }}
      >
        <span className="flex items-center gap-1">
          <MapPin style={{ width: 12, height: 12, color: "#E5B84B" }} />
          {distance.toFixed(2)} km from shop
        </span>
        <span className={outOfRange ? "text-red-200" : "text-green-200"}>
          {outOfRange ? "Outside delivery area" : fee === 0 ? "Free delivery" : `Fee: ${formatINR(fee)}`}
        </span>
      </div>
    </div>
  );
}
