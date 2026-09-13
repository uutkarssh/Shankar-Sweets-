import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { BUSINESS, formatINR } from "@/lib/constants";
import { Truck, Percent, Clock, Phone, Tag } from "lucide-react";

export const dynamic = "force-dynamic";

export default function OffersPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-3xl px-3 pt-4 sm:px-4">
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>Offers & Info</h1>
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          {/* Offers */}
          <div className="space-y-3">
            <OfferCard
              icon={Truck}
              title="Free Delivery above ₹300"
              desc={`Orders within ${BUSINESS.deliveryRadiusKm} km and above ${formatINR(BUSINESS.freeDeliveryThreshold)} get free delivery — no coupon needed.`}
              accent
            />
            <OfferCard
              icon={Tag}
              title="Slab-based delivery fee"
              desc={`Orders at or below ₹300 within ${BUSINESS.deliveryRadiusKm} km pay a distance-based fee from ₹10 to ₹70 (rounded to nearest ₹5).`}
            />
            <OfferCard
              icon={Clock}
              title="Open Daily"
              desc={`Service hours: ${BUSINESS.openingTime} to ${BUSINESS.closingTime}, every day.`}
            />
            <OfferCard
              icon={Phone}
              title="Call to Order"
              desc={`Prefer to call? Reach us at ${BUSINESS.phones.join(" or ")}.`}
            />
          </div>

          {/* Loyalty note */}
          <div className="mt-5 rounded-2xl p-5 text-center" style={{ background: "#641C27", color: "#FFF8E8" }}>
            <div className="gold-divider mb-3 mx-auto max-w-xs"><svg width="24" height="10" viewBox="0 0 24 10" fill="none" aria-hidden><path d="M12 0 L15 5 L12 10 L9 5 Z" fill="#D4A83E" /></svg></div>
            <h3 className="text-base font-bold" style={{ fontFamily: "var(--font-poppins)" }}>{BUSINESS.tagline}</h3>
            <p className="mt-1 text-xs italic" style={{ color: "#E5B84B" }}>Serving Baraut since {BUSINESS.sinceYear}</p>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function OfferCard({ icon: Icon, title, desc, accent }: { icon: React.ElementType; title: string; desc: string; accent?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border p-4" style={{ borderColor: accent ? "#D4A83E" : "#E8D9B8", background: accent ? "#FFFFFF" : "#FFFFFF", boxShadow: accent ? "0 4px 18px -8px rgba(212,168,62,0.4)" : "none" }}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: accent ? "#641C27" : "#F5E8CF" }}>
        <Icon style={{ width: 18, height: 18, color: accent ? "#E5B84B" : "#641C27" }} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "#76544A" }}>{desc}</p>
      </div>
    </div>
  );
}
