"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  return (
    <div className="mx-auto max-w-6xl px-3 pt-3 sm:px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/menu?q=${encodeURIComponent(q)}`);
        }}
        className="flex items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-sm"
        style={{ background: "#FFFFFF", borderColor: "#E8D9B8" }}
      >
        <Search className="shrink-0" style={{ color: "#76544A", width: 18, height: 18 }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for sweets, bakery, ice cream, chaat..."
          className="w-full bg-transparent text-sm focus:outline-none"
          style={{ color: "#2C1715", fontFamily: "var(--font-outfit)" }}
          aria-label="Search menu items"
        />
      </form>
    </div>
  );
}
