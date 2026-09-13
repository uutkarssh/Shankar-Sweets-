"use client";

import { cn } from "@/lib/utils";

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
};

export function CategoryRow({
  categories,
  activeSlug,
  onSelect,
}: {
  categories: Category[];
  activeSlug?: string;
  onSelect?: (slug: string) => void;
}) {
  return (
    <div className="no-scrollbar mx-auto flex max-w-6xl gap-3 overflow-x-auto px-3 py-4 sm:px-4">
      {categories.map((c) => {
        const active = activeSlug === c.slug;
        return (
          <button
            key={c.id}
            onClick={() => onSelect?.(c.slug)}
            className="group flex w-20 shrink-0 flex-col items-center gap-2"
            aria-label={`Browse ${c.name}`}
          >
            <div
              className={cn(
                "relative h-20 w-20 overflow-hidden rounded-2xl border transition",
                active ? "ring-2 ring-offset-2" : ""
              )}
              style={{
                background: active ? "#641C27" : "#F5E8CF",
                borderColor: active ? "#641C27" : "#D4A83E",
                ["--tw-ring-color" as string]: "#D4A83E",
                ["--tw-ring-offset-color" as string]: "#FFF8E8",
              }}
            >
              {c.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.icon}
                  alt={c.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-bold" style={{ color: "#641C27" }}>
                  {c.name.charAt(0)}
                </div>
              )}
            </div>
            <span
              className="line-clamp-1 text-center text-[11px] font-semibold leading-tight"
              style={{ color: active ? "#641C27" : "#76544A", fontFamily: "var(--font-poppins)" }}
            >
              {c.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
