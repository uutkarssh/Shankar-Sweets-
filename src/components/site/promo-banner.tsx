"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

const SLIDES = [
  {
    heading: "Authentic Flavours\nNow at Your Doorstep",
    sub: "Sweets • Bakery • Ice Cream • Chaat",
    tagline: "Same Great Taste Since 1962",
    image: "/images/brand/promo-gulabjamun.png",
    cta: "ORDER NOW",
  },
  {
    heading: "Wood-fired Pizzas\nMade Fresh, Delivered Hot",
    sub: "Margherita • Paneer Special • Kulhad Pizza",
    tagline: "Baraut's Favourite Since 1962",
    image: "/images/categories/pizza.png",
    cta: "ORDER NOW",
  },
  {
    heading: "Crisp Chaat &\nCreamy Lassi",
    sub: "Tikki • Papdi • Dahi Bada • Gulab Jamun",
    tagline: "Tradition in Every Bite",
    image: "/images/items/lassi.png",
    cta: "ORDER NOW",
  },
];

export function PromoBanner() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[idx];

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4">
      <div
        className="relative overflow-hidden rounded-3xl px-5 py-6 sm:px-8 sm:py-8"
        style={{ background: "linear-gradient(135deg, #641C27 0%, #3D1018 100%)" }}
      >
        {/* ornamental gold border */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{ border: "1px solid rgba(212,168,62,0.35)" }}
        />
        {/* corner flourishes */}
        <Corner className="left-2 top-2" />
        <Corner className="right-2 top-2 rotate-90" />
        <Corner className="bottom-2 left-2 -rotate-90" />
        <Corner className="bottom-2 right-2 rotate-180" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "#E5B84B" }}>
              SHANKAR
            </div>
            <h2
              className="whitespace-pre-line text-2xl font-bold leading-tight text-white sm:text-3xl"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {slide.heading}
            </h2>
            <p className="mt-1 text-xs font-medium text-white/80 sm:text-sm">{slide.sub}</p>
            <button
              onClick={() => router.push("/menu")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition hover:scale-[1.02]"
              style={{ background: "#641C27", color: "#FFF8E8", border: "1.5px solid #D4A83E" }}
            >
              {slide.cta}
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>

          <div className="relative hidden h-28 w-28 shrink-0 sm:block sm:h-36 sm:w-36">
            <Image
              src={slide.image}
              alt={slide.heading.replace(/\n/g, " ")}
              fill
              className="object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
              sizes="144px"
              priority
            />
          </div>
        </div>

        {/* tagline top-right */}
        <div
          className="absolute right-4 top-3 hidden text-right text-[11px] italic sm:block"
          style={{ color: "#E5B84B", fontFamily: "var(--font-poppins)" }}
        >
          {slide.tagline}
        </div>

        {/* dots */}
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? 18 : 6,
                background: i === idx ? "#E5B84B" : "rgba(255,248,232,0.4)",
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Corner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute h-5 w-5 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      style={{ color: "#D4A83E" }}
      aria-hidden
    >
      <path d="M2 2 L10 2 M2 2 L2 10 M2 2 C 8 4, 10 6, 12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}
