"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useEffect, useState } from "react";
import { TrendingUp, ShoppingBag, IndianRupee, Clock, Package, CreditCard, BarChart3, Star, Download } from "lucide-react";
import { formatINR } from "@/lib/constants";

type Analytics = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  deliveredCount: number;
  pendingCount: number;
  todayRevenue: number;
  todayOrders: number;
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  popularItems: { name: string; qty: number; revenue: number }[];
  paymentSplit: { cod: number; upi: number };
  categoryCounts: { name: string; count: number }[];
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxRevenue = data ? Math.max(...data.dailyRevenue.map((d) => d.revenue), 1) : 1;
  const maxItemQty = data ? Math.max(...data.popularItems.map((i) => i.qty), 1) : 1;
  const maxCatCount = data ? Math.max(...data.categoryCounts.map((c) => c.count), 1) : 1;
  const totalPayments = data ? data.paymentSplit.cod + data.paymentSplit.upi : 1;

  return (
    <AdminShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Analytics Dashboard</h1>
          <div className="gold-divider mt-2"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/export?type=orders"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
            style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
          >
            <Download style={{ width: 12, height: 12, color: "#E5B84B" }} /> Orders CSV
          </a>
          <a
            href="/api/admin/export?type=menu"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
            style={{ background: "#F5E8CF", color: "#641C27", border: "1px solid #E8D9B8" }}
          >
            <Download style={{ width: 12, height: 12 }} /> Menu CSV
          </a>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="shimmer h-28 rounded-2xl" />)}
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
          <BarChart3 style={{ width: 36, height: 36, color: "#D4A83E", margin: "0 auto" }} />
          <p className="mt-2 text-sm font-semibold" style={{ color: "#641C27" }}>No data yet</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard icon={IndianRupee} label="Total Revenue" value={formatINR(data.totalRevenue)} sub={`${data.totalOrders} orders`} accent />
            <KPICard icon={ShoppingBag} label="Today's Revenue" value={formatINR(data.todayRevenue)} sub={`${data.todayOrders} orders today`} />
            <KPICard icon={TrendingUp} label="Avg Order Value" value={formatINR(data.avgOrderValue)} sub="per order" />
            <KPICard icon={Package} label="Delivered" value={String(data.deliveredCount)} sub={`${data.pendingCount} pending`} />
          </div>

          {/* Revenue chart */}
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 style={{ width: 16, height: 16, color: "#D4A83E" }} />
              <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Revenue — Last 7 Days</h3>
            </div>
            <div className="flex h-40 items-end justify-between gap-2">
              {data.dailyRevenue.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="text-[9px] font-bold" style={{ color: "#641C27" }}>{d.revenue > 0 ? formatINR(d.revenue) : ""}</div>
                  <div
                    className="w-full rounded-t-lg transition-all hover:opacity-80"
                    style={{
                      height: `${Math.max((d.revenue / maxRevenue) * 100, 4)}%`,
                      background: "linear-gradient(180deg, #D4A83E 0%, #641C27 100%)",
                    }}
                    title={`${d.date}: ${formatINR(d.revenue)} (${d.orders} orders)`}
                  />
                  <div className="text-[9px]" style={{ color: "#76544A" }}>{d.date}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Popular items */}
            <div className="rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <div className="mb-3 flex items-center gap-2">
                <Star style={{ width: 16, height: 16, color: "#D4A83E" }} className="fill-current" />
                <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Popular Items</h3>
              </div>
              <div className="space-y-2">
                {data.popularItems.length === 0 ? (
                  <p className="text-xs" style={{ color: "#76544A" }}>No sales yet.</p>
                ) : (
                  data.popularItems.map((it, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-5 text-xs font-bold" style={{ color: "#76544A" }}>{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-xs font-semibold" style={{ color: "#3D1018" }}>{it.name}</span>
                          <span className="text-xs font-bold" style={{ color: "#641C27" }}>{it.qty} sold</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "#F5E8CF" }}>
                          <div className="h-full rounded-full" style={{ width: `${(it.qty / maxItemQty) * 100}%`, background: "#641C27" }} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payment split + categories */}
            <div className="space-y-4">
              {/* Payment split */}
              <div className="rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                <div className="mb-3 flex items-center gap-2">
                  <CreditCard style={{ width: 16, height: 16, color: "#D4A83E" }} />
                  <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Payment Methods</h3>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "#641C27", color: "#FFF8E8" }}>
                    <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-poppins)" }}>{data.paymentSplit.cod}</div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "#E5B84B" }}>COD</div>
                  </div>
                  <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "#F5E8CF", color: "#641C27" }}>
                    <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-poppins)" }}>{data.paymentSplit.upi}</div>
                    <div className="text-[10px] uppercase tracking-wider">UPI</div>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "#F5E8CF" }}>
                  <div className="h-full" style={{ width: `${(data.paymentSplit.cod / totalPayments) * 100}%`, background: "#641C27" }} />
                </div>
              </div>

              {/* Category counts */}
              <div className="rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                <div className="mb-3 flex items-center gap-2">
                  <Package style={{ width: 16, height: 16, color: "#D4A83E" }} />
                  <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Menu by Category</h3>
                </div>
                <div className="space-y-1.5">
                  {data.categoryCounts.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-16 truncate text-[11px] font-semibold" style={{ color: "#3D1018" }}>{c.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "#F5E8CF" }}>
                        <div className="h-full rounded-full" style={{ width: `${(c.count / maxCatCount) * 100}%`, background: "linear-gradient(90deg,#D4A83E,#E5B84B)" }} />
                      </div>
                      <span className="w-6 text-right text-[11px] font-bold" style={{ color: "#641C27" }}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}

function KPICard({ icon: Icon, label, value, sub, accent }: { icon: React.ElementType; label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: accent ? "#D4A83E" : "#E8D9B8", background: accent ? "#641C27" : "#FFFFFF" }}>
      <div className="flex items-center justify-between">
        <Icon style={{ width: 18, height: 18, color: accent ? "#E5B84B" : "#D4A83E" }} />
      </div>
      <div className="mt-2 text-xl font-bold" style={{ color: accent ? "#FFF8E8" : "#641C27", fontFamily: "var(--font-poppins)" }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: accent ? "#E5B84B" : "#76544A" }}>{label}</div>
      <div className="mt-0.5 text-[10px]" style={{ color: accent ? "rgba(255,248,232,0.7)" : "#76544A" }}>{sub}</div>
    </div>
  );
}
