"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartVariant = {
  label: string; // e.g. "Large", "Full", "250g", "1 pc"
  price: number;
};

export type CartLine = {
  itemId: string;
  name: string;
  image?: string;
  variant: CartVariant;
  qty: number;
};

export type DeliveryAddress = {
  label: string; // short label shown in header
  fullAddress: string;
  landmark?: string;
  pincode: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
};

type CartState = {
  lines: CartLine[];
  address: DeliveryAddress | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
  add: (line: CartLine) => void;
  remove: (itemId: string, variantLabel: string) => void;
  setQty: (itemId: string, variantLabel: string, qty: number) => void;
  clear: () => void;
  setAddress: (a: DeliveryAddress | null) => void;
  setCustomer: (c: { name: string; phone: string; email: string }) => void;
  setNotes: (n: string) => void;
  subtotal: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      address: null,
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      notes: "",
      add: (line) => {
        const lines = [...get().lines];
        const idx = lines.findIndex(
          (l) => l.itemId === line.itemId && l.variant.label === line.variant.label
        );
        if (idx >= 0) {
          lines[idx] = { ...lines[idx], qty: lines[idx].qty + line.qty };
        } else {
          lines.push(line);
        }
        set({ lines });
      },
      remove: (itemId, variantLabel) =>
        set({
          lines: get().lines.filter(
            (l) => !(l.itemId === itemId && l.variant.label === variantLabel)
          ),
        }),
      setQty: (itemId, variantLabel, qty) => {
        if (qty <= 0) {
          get().remove(itemId, variantLabel);
          return;
        }
        set({
          lines: get().lines.map((l) =>
            l.itemId === itemId && l.variant.label === variantLabel
              ? { ...l, qty }
              : l
          ),
        });
      },
      clear: () => set({ lines: [], notes: "" }),
      setAddress: (address) => set({ address }),
      setCustomer: (c) =>
        set({ customerName: c.name, customerPhone: c.phone, customerEmail: c.email }),
      setNotes: (notes) => set({ notes }),
      subtotal: () =>
        get().lines.reduce((s, l) => s + l.variant.price * l.qty, 0),
      count: () => get().lines.reduce((s, l) => s + l.qty, 0),
    }),
    { name: "shankar-cart" }
  )
);

// ─── Wishlist store ───────────────────────────────────────────
export type WishlistItem = {
  id: string;
  name: string;
  image?: string;
  price: number;
};

type WishlistState = {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  has: (id: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => {
        const exists = get().items.some((i) => i.id === item.id);
        set({
          items: exists
            ? get().items.filter((i) => i.id !== item.id)
            : [...get().items, item],
        });
      },
      has: (id) => get().items.some((i) => i.id === id),
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      clear: () => set({ items: [] }),
    }),
    { name: "shankar-wishlist" }
  )
);
