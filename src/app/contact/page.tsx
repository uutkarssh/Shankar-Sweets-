import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { BUSINESS } from "@/lib/constants";
import { MapPin, Phone, Clock, Mail, Navigation, Award, HeartHandshake, Leaf } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  const mapsEmbed = `https://www.google.com/maps?q=${BUSINESS.lat},${BUSINESS.lng}&z=16&output=embed`;
  const mapsLink = `https://www.google.com/maps?q=${BUSINESS.lat},${BUSINESS.lng}`;
  const years = new Date().getFullYear() - BUSINESS.sinceYear;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-3xl px-3 pt-4 sm:px-4">
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>Contact & About</h1>
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          {/* Heritage hero */}
          <div className="ornate-frame relative overflow-hidden rounded-3xl px-6 py-8 text-center" style={{ background: "linear-gradient(135deg, #641C27 0%, #3D1018 100%)" }}>
            <div className="gold-divider mb-3 mx-auto max-w-xs">
              <Award style={{ width: 18, height: 18, color: "#E5B84B" }} />
            </div>
            <div className="text-4xl font-extrabold sm:text-5xl" style={{ fontFamily: "var(--font-poppins)", color: "#E5B84B" }}>
              {years}+ Years
            </div>
            <h2 className="mt-2 text-lg font-bold text-white sm:text-xl" style={{ fontFamily: "var(--font-poppins)" }}>
              {BUSINESS.name}
            </h2>
            <p className="mt-1 text-xs italic" style={{ color: "#E5B84B" }}>{BUSINESS.tagline} - Since {BUSINESS.sinceYear}</p>
            <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed" style={{ color: "rgba(255,248,232,0.8)" }}>
              Three generations of authentic recipes, handcrafted sweets, and freshly baked goodness.
              From traditional Indian mithai to wood-fired pizzas, we bring the taste of tradition to your doorstep.
            </p>
          </div>

          {/* Contact cards */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ContactCard icon={MapPin} title="Visit Us" lines={[BUSINESS.address]} action={{ label: "Get Directions", href: mapsLink }} />
            <ContactCard icon={Phone} title="Call Us" lines={BUSINESS.phones} action={{ label: "Call Now", href: `tel:${BUSINESS.phones[0]}` }} />
            <ContactCard icon={Clock} title="Opening Hours" lines={[`Daily - ${BUSINESS.openingTime} to ${BUSINESS.closingTime}`]} />
            <ContactCard icon={Mail} title="Email" lines={["shankarsweets@baraut.in"]} />
          </div>

          {/* Map embed */}
          <div className="mt-4 overflow-hidden rounded-3xl border" style={{ borderColor: "#E8D9B8" }}>
            <div className="aspect-video w-full" style={{ background: "#F5E8CF" }}>
              <iframe
                src={mapsEmbed}
                className="h-full w-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Shankar Sweets location map"
              />
            </div>
            <a
              href={mapsLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 py-3 text-sm font-semibold transition"
              style={{ background: "#641C27", color: "#FFF8E8" }}
            >
              <Navigation style={{ width: 14, height: 14, color: "#E5B84B" }} />
              Open in Google Maps
            </a>
          </div>

          {/* Values */}
          <h2 className="mb-2 mt-6 flex items-center gap-2 text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
            <span className="h-4 w-1 rounded-full" style={{ background: "#D4A83E" }} />
            Our Values
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ValueCard icon={Award} title="Heritage" desc={years + "+ years of authentic recipes passed down through generations."} />
            <ValueCard icon={Leaf} title="Pure and Fresh" desc="Made daily with quality ingredients, no artificial preservatives." />
            <ValueCard icon={HeartHandshake} title="Community" desc="Proudly serving Baraut and Prayagraj with love since 1962." />
          </div>

          {/* Categories */}
          <h2 className="mb-2 mt-6 flex items-center gap-2 text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
            <span className="h-4 w-1 rounded-full" style={{ background: "#D4A83E" }} />
            What We Serve
          </h2>
          <div className="flex flex-wrap gap-2">
            {BUSINESS.categories.map((c) => (
              <span
                key={c}
                className="rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: "#F5E8CF", color: "#641C27", border: "1px solid #E8D9B8" }}
              >
                {c}
              </span>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-6 rounded-2xl p-4 text-center" style={{ background: "#641C27", color: "#FFF8E8" }}>
            <p className="text-xs italic" style={{ color: "#E5B84B" }}>Taste the Tradition</p>
            <p className="mt-1 text-[11px]" style={{ color: "rgba(255,248,232,0.7)" }}>
              Order online for delivery within {BUSINESS.deliveryRadiusKm} km of our shop.
            </p>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function ContactCard({ icon: Icon, title, lines, action }: { icon: React.ElementType; title: string; lines: string[]; action?: { label: string; href: string } }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "#641C27" }}>
          <Icon style={{ width: 16, height: 16, color: "#E5B84B" }} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{title}</h3>
      </div>
      <div className="mt-2 space-y-0.5">
        {lines.map((l, i) => (
          <p key={i} className="text-xs" style={{ color: "#3D1018" }}>{l}</p>
        ))}
      </div>
      {action && (
        <a
          href={action.href}
          target={action.href.startsWith("http") ? "_blank" : undefined}
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide"
          style={{ color: "#641C27" }}
        >
          {action.label} {"->"}
        </a>
      )}
    </div>
  );
}

function ValueCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border p-4 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full" style={{ background: "#641C27" }}>
        <Icon style={{ width: 18, height: 18, color: "#E5B84B" }} />
      </div>
      <h3 className="mt-2 text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{title}</h3>
      <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "#76544A" }}>{desc}</p>
    </div>
  );
}
