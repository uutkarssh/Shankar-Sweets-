"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, MapPin, Loader2 } from "lucide-react";
import { BUSINESS, haversineKm, calculateDeliveryFee, formatINR } from "@/lib/constants";

// Fix default icon path for Leaflet in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom draggable pin icon (burgundy, matching brand)
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="transform: translate(-50%, -100%);"><svg width="34" height="42" viewBox="0 0 24 24" fill="#641C27" stroke="#E5B84B" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
  iconSize: [34, 42],
  iconAnchor: [0, 0],
});

// Restaurant marker icon
const restaurantIcon = L.divIcon({
  className: "",
  html: `<div style="transform: translate(-50%, -100%);"><div style="background:#3D1018;border:2px solid #D4A83E;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:#E5B84B;font-weight:bold;font-size:12px;">S</div></div>`,
  iconSize: [30, 30],
  iconAnchor: [0, 0],
});

export function LeafletMap({
  pin,
  onPinMove,
}: {
  pin: [number, number];
  onPinMove: (lat: number, lng: number) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [autoLocated, setAutoLocated] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);

  const distance = haversineKm(BUSINESS.lat, BUSINESS.lng, pin[0], pin[1]);
  const outOfRange = distance > BUSINESS.deliveryRadiusKm;
  const fee = calculateDeliveryFee(distance, 0);

  const useCurrentLocation = useCallback(() => {
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
  }, [onPinMove]);

  // Auto-locate on mount
  useEffect(() => {
    if (autoLocated) return;
    setAutoLocated(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onPinMove(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [autoLocated, onPinMove]);

  // Initialize map using vanilla Leaflet — gives full control over timing
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Wait for the container to have non-zero dimensions
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // Retry after a short delay if dimensions aren't ready
      const t = setTimeout(() => setMapReady(!mapReady), 100);
      return () => clearTimeout(t);
    }

    // Create the map with explicit dimensions
    const map = L.map(container, {
      center: pin,
      zoom: 15,
      scrollWheelZoom: false,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Restaurant marker
    L.marker([BUSINESS.lat, BUSINESS.lng], { icon: restaurantIcon }).addTo(map);

    // Draggable pin marker
    const pinMarker = L.marker(pin, { icon: pinIcon, draggable: true }).addTo(map);
    pinMarker.on("drag", (e: any) => {
      const ll = e.target.getLatLng();
      onPinMove(ll.lat, ll.lng);
    });
    pinMarker.on("dragend", (e: any) => {
      const ll = e.target.getLatLng();
      onPinMove(ll.lat, ll.lng);
    });

    // Click to move
    map.on("click", (e: any) => {
      onPinMove(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    pinMarkerRef.current = pinMarker;

    // Call invalidateSize after a short delay to ensure tiles render correctly
    setTimeout(() => {
      map.invalidateSize();
      // Force a re-render of tiles by panning slightly
      map.panBy([0, 0], { animate: false });
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      pinMarkerRef.current = null;
    };
  }, [mapReady]);

  // Update pin position when prop changes
  useEffect(() => {
    if (pinMarkerRef.current && mapRef.current) {
      pinMarkerRef.current.setLatLng(pin);
      mapRef.current.panTo(pin, { animate: true });
    }
  }, [pin]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-3xl border"
      style={{ height: "280px", minHeight: "280px" }}
    >
      {/* Use current location button */}
      <button
        onClick={useCurrentLocation}
        className="absolute right-3 top-3 z-[1000] grid h-11 w-11 place-items-center rounded-full bg-white shadow-md transition hover:bg-gray-50"
        aria-label="Use current location"
      >
        {locating ? (
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#641C27" }} />
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
