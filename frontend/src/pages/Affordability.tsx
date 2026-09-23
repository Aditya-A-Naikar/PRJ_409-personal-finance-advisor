import { useState } from "react";
import {
  CheckCircle2, XCircle, Loader2, AlertCircle, ShieldCheck, Info,
  TrendingDown, Wallet, ArrowRight,
} from "lucide-react";
import api from "../services/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface SupportingTransaction {
  date: string;
  merchant: string;
  amount: number;
  category: string;
}

interface AffordabilityResult {
  item_name: string | null;
  purchase_amount: number;
  affordable: boolean;
  current_available: number;
  safety_buffer: number;
  projected_after_purchase: number;
  reason: string;
  supporting_transactions: SupportingTransaction[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 250000, 500000];

// ── Result Panel ───────────────────────────────────────────────────────────
function ResultPanel({ result }: { result: AffordabilityResult }) {
  const pct = result.current_available > 0
    ? Math.min((result.purchase_amount / result.current_available) * 100, 200)
    : 100;
  const afterNeg = result.projected_after_purchase < 0;

  return (
    <div className="space-y-5 mt-6 animate-[fadeIn_0.3s_ease-in-out]">
      {/* Verdict banner */}
      <div className={`rounded-2xl p-5 flex items-center gap-4 ${
        result.affordable
          ? "bg-emerald-50 border border-emerald-200"
          : "bg-rose-50 border border-rose-200"
      }`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          result.affordable ? "bg-emerald-100" : "bg-rose-100"
        }`}>
          {result.affordable
            ? <CheckCircle2 size={26} className="text-emerald-600" />
            : <XCircle size={26} className="text-rose-600" />}
        </div>
        <div>
          <p className={`text-lg font-bold ${result.affordable ? "text-emerald-800" : "text-rose-800"}`}>
            {result.affordable ? "✓ Affordable" : "✗ Not Affordable"}
            {result.item_name && <span className="ml-2 font-normal text-base">— {result.item_name}</span>}
          </p>
          <p className={`text-sm mt-0.5 ${result.affordable ? "text-emerald-700" : "text-rose-700"}`}>
            {result.reason}
          </p>
        </div>
      </div>

      {/* Financial breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Wallet size={14} className="text-blue-600" /> Financial Breakdown
        </h3>
        <div className="space-y-3">
          {[
            {
              label: "Available Disposable Income",
              value: fmt.format(result.current_available),
              sub: "income − avg expenses − committed goal savings",
              cls: "text-slate-900",
              icon: Wallet,
              iconCls: "text-blue-500",
            },
            {
              label: "Purchase Amount",
              value: fmt.format(result.purchase_amount),
              sub: `${pct.toFixed(0)}% of available funds`,
              cls: "text-slate-900",
              icon: ArrowRight,
              iconCls: "text-slate-400",
            },
            {
              label: "Safety Buffer",
              value: fmt.format(result.safety_buffer),
              sub: "Minimum recommended reserve",
              cls: "text-amber-700",
              icon: ShieldCheck,
              iconCls: "text-amber-500",
            },
            {
              label: "Projected Balance After Purchase",
              value: afterNeg ? `−${fmt.format(Math.abs(result.projected_after_purchase))}` : fmt.format(result.projected_after_purchase),
              sub: afterNeg ? "Would go negative — not recommended" : "Remaining after purchase",
              cls: afterNeg ? "text-rose-700" : "text-emerald-700",
              icon: TrendingDown,
              iconCls: afterNeg ? "text-rose-500" : "text-emerald-500",
            },
          ].map(({ label, value, sub, cls, icon: Icon, iconCls }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2">
                <Icon size={14} className={iconCls} />
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              </div>
              <p className={`text-sm font-bold tabular-nums ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Visual meter */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Purchase vs Available</span>
            <span>{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pct > 100 ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Supporting transactions */}
      {result.supporting_transactions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Info size={14} className="text-blue-600" /> Recent Expenses (Context)
          </h3>
          <div className="space-y-2">
            {result.supporting_transactions.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-slate-800">{t.merchant}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {t.category}
                  </p>
                </div>
                <p className="text-slate-700 font-semibold tabular-nums">{fmt.format(t.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Affordability Page ────────────────────────────────────────────────
export default function Affordability() {
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AffordabilityResult | null>(null);
  const [error, setError] = useState("");

  const handleCheck = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await api.post("/affordability/check", {
        item_name: itemName || undefined,
        purchase_amount: parseFloat(amount),
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Could not check affordability. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const quickSet = (val: number) => {
    setAmount(val.toString());
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Affordability Checker</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Check if you can afford a purchase based on your income, expenses, and committed goal savings.
        </p>
      </div>

      {/* Input card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Enter Purchase Details</h2>

        <form onSubmit={handleCheck} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              What do you want to buy? <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. iPhone 15, New Laptop, Flight to Goa…"
              value={itemName}
              onChange={e => { setItemName(e.target.value); setResult(null); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Purchase Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              step="100"
              placeholder="Enter amount…"
              value={amount}
              onChange={e => { setAmount(e.target.value); setResult(null); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-lg font-semibold"
            />
          </div>

          {/* Quick amounts */}
          <div>
            <p className="text-xs text-slate-500 mb-2 font-medium">Quick amounts:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => quickSet(v)}
                  className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                    amount === v.toString()
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {fmt.format(v)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" />Calculating…</>
              : <><ShieldCheck size={15} />Check Affordability</>}
          </button>
        </form>
      </div>

      {/* How it works */}
      {!result && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Info size={14} className="text-blue-600" /> How it works
          </h3>
          <ol className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2"><span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>We calculate your avg monthly income minus avg monthly expenses.</li>
            <li className="flex items-start gap-2"><span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>We subtract your committed monthly goal savings from disposable income.</li>
            <li className="flex items-start gap-2"><span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>We check if the purchase fits within the remaining balance + safety buffer rule.</li>
          </ol>
        </div>
      )}

      {/* Result */}
      {result && <ResultPanel result={result} />}
    </div>
  );
}
