"use client";

import { useState } from "react";
import { Award, Search, Coins, TrendingUp, Gift, History } from "lucide-react";
import { toast } from "sonner";

type Transaction = {
  id: string;
  points: number;
  type: string;
  note: string | null;
  createdAt: string;
};

type Account = {
  phone: string;
  name: string | null;
  points: number;
  totalSpent: number;
  ordersCount: number;
};

export function LoyaltyWidget() {
  const [phone, setPhone] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rupeeValue, setRupeeValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length !== 10) {
      toast.error("Enter a valid 10-digit phone");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/loyalty?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
      const d = await res.json();
      setAccount(d.account);
      setTransactions(d.transactions || []);
      setRupeeValue(d.rupeeValue || 0);
    } catch {
      toast.error("Failed to fetch loyalty info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "#D4A83E", background: "linear-gradient(135deg, #641C27 0%, #3D1018 100%)" }}>
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-full" style={{ background: "rgba(229,184,75,0.2)" }}>
          <Award style={{ width: 20, height: 20, color: "#E5B84B" }} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-poppins)" }}>Shankar Rewards</h3>
          <p className="text-[10px]" style={{ color: "#E5B84B" }}>Earn 1 point per ₹10 spent</p>
        </div>
      </div>

      <form onSubmit={check} className="mt-3 flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Enter your phone"
          inputMode="numeric"
          className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
          style={{ borderColor: "#D4A83E", background: "#FFF8E8", color: "#2C1715" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
          style={{ background: "#FFF8E8", color: "#641C27" }}
        >
          <Search style={{ width: 12, height: 12 }} /> Check
        </button>
      </form>

      {searched && !loading && !account && (
        <div className="mt-4 rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.1)" }}>
          <Gift style={{ width: 28, height: 28, color: "#E5B84B", margin: "0 auto" }} />
          <p className="mt-1 text-sm font-semibold text-white">No rewards yet</p>
          <p className="text-[11px]" style={{ color: "rgba(255,248,232,0.7)" }}>Place an order to start earning points!</p>
        </div>
      )}

      {account && (
        <div className="mt-4 space-y-3">
          {/* Points balance */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-2 text-center" style={{ background: "rgba(229,184,75,0.15)" }}>
              <Coins style={{ width: 16, height: 16, color: "#E5B84B", margin: "0 auto" }} />
              <div className="mt-0.5 text-lg font-extrabold" style={{ color: "#E5B84B", fontFamily: "var(--font-poppins)" }}>{account.points}</div>
              <div className="text-[8px] uppercase tracking-wider" style={{ color: "rgba(255,248,232,0.7)" }}>Points</div>
            </div>
            <div className="rounded-xl p-2 text-center" style={{ background: "rgba(47,107,69,0.2)" }}>
              <TrendingUp style={{ width: 16, height: 16, color: "#7BC899", margin: "0 auto" }} />
              <div className="mt-0.5 text-lg font-extrabold" style={{ color: "#7BC899", fontFamily: "var(--font-poppins)" }}>₹{rupeeValue}</div>
              <div className="text-[8px] uppercase tracking-wider" style={{ color: "rgba(255,248,232,0.7)" }}>Value</div>
            </div>
            <div className="rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <Award style={{ width: 16, height: 16, color: "#FFF8E8", margin: "0 auto" }} />
              <div className="mt-0.5 text-lg font-extrabold text-white" style={{ fontFamily: "var(--font-poppins)" }}>{account.ordersCount}</div>
              <div className="text-[8px] uppercase tracking-wider" style={{ color: "rgba(255,248,232,0.7)" }}>Orders</div>
            </div>
          </div>

          {/* Total spent */}
          <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(255,255,255,0.08)" }}>
            <span style={{ color: "rgba(255,248,232,0.8)" }}>Total Spent</span>
            <span className="font-bold" style={{ color: "#E5B84B" }}>₹{Math.round(account.totalSpent)}</span>
          </div>

          {/* Transactions */}
          {transactions.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#E5B84B" }}>
                <History style={{ width: 11, height: 11 }} /> Recent Activity
              </div>
              <div className="max-h-32 space-y-1 overflow-y-auto fancy-scroll">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded px-2 py-1 text-[11px]" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <span style={{ color: "rgba(255,248,232,0.8)" }}>
                      {t.type === "EARNED" ? "Earned" : t.type === "REDEEMED" ? "Redeemed" : "Bonus"}
                      {t.note && <span style={{ color: "rgba(255,248,232,0.5)" }}> · {t.note}</span>}
                    </span>
                    <span className="font-bold" style={{ color: t.points > 0 ? "#7BC899" : "#FFB4B4" }}>
                      {t.points > 0 ? "+" : ""}{t.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-[9px]" style={{ color: "rgba(255,248,232,0.5)" }}>
            100 points = ₹10 discount · Earn automatically on delivered orders
          </p>
        </div>
      )}
    </div>
  );
}
