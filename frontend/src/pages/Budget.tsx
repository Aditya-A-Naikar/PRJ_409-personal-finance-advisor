import { useEffect, useState } from "react";
import {
  PiggyBank, RefreshCw, AlertCircle, CheckCircle2,
  TrendingDown, Loader2, ChevronUp, ChevronDown,
} from "lucide-react";
import api from "../services/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface BudgetItem {
  category: string;
  recommended_amount: number;
  actual_amount: number;
  remaining_amount: number;
  status: "overspending" | "on_track" | "under";
}
interface BudgetResponse {
  month: string | null;
  items: BudgetItem[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const STATUS_CONFIG = {
  overspending: {
    label: "Overspending",
    pill: "bg-rose-100 text-rose-700",
    bar: "bg-rose-500",
    icon: AlertCircle,
    iconCls: "text-rose-500",
    border: "border-rose-200",
    bg: "bg-rose-50",
  },
  on_track: {
    label: "On Track",
    pill: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
    icon: CheckCircle2,
    iconCls: "text-emerald-500",
    border: "border-emerald-100",
    bg: "bg-white",
  },
  under: {
    label: "Under Budget",
    pill: "bg-blue-100 text-blue-700",
    bar: "bg-blue-400",
    icon: TrendingDown,
    iconCls: "text-blue-400",
    border: "border-slate-200",
    bg: "bg-white",
  },
};

const CAT_ICONS: Record<string, string> = {
  Food: "🍔", Rent: "🏠", EMI: "🏦", Transport: "🚗",
  "Salary/Income": "💰", Shopping: "🛍️", Utilities: "⚡",
  Healthcare: "🏥", Subscription: "📺", Entertainment: "🎬",
  Education: "📚", Other: "📦",
};

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-blue-600" />
        <p className="text-sm text-slate-400">Loading budget…</p>
      </div>
    </div>
  );
}

// ── Budget Card ────────────────────────────────────────────────────────────
function BudgetCard({ item }: { item: BudgetItem }) {
  const cfg = STATUS_CONFIG[item.status];
  const IconEl = cfg.icon;
  const pct = item.recommended_amount > 0
    ? Math.min((item.actual_amount / item.recommended_amount) * 100, 100)
    : 0;
  const overPct = item.recommended_amount > 0
    ? ((item.actual_amount - item.recommended_amount) / item.recommended_amount * 100)
    : 0;

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 shadow-sm hover:shadow-md transition-all`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="text-2xl">{CAT_ICONS[item.category] ?? "📦"}</div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{item.category}</p>
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${cfg.pill}`}>
              {cfg.label}
            </span>
          </div>
        </div>
        <IconEl size={18} className={cfg.iconCls} />
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-slate-500">{pct.toFixed(0)}% used</span>
          {item.status === "overspending" && (
            <span className="text-xs font-medium text-rose-600">
              +{overPct.toFixed(0)}% over
            </span>
          )}
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Spent</p>
          <p className={`text-sm font-bold tabular-nums ${
            item.status === "overspending" ? "text-rose-700" : "text-slate-900"
          }`}>{fmt.format(item.actual_amount)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Budget</p>
          <p className="text-sm font-bold text-slate-900 tabular-nums">{fmt.format(item.recommended_amount)}</p>
        </div>
        <div className="col-span-2 pt-1">
          <p className="text-xs text-slate-400 mb-0.5">Remaining</p>
          <p className={`text-sm font-semibold tabular-nums ${
            item.remaining_amount < 0 ? "text-rose-600" : "text-emerald-600"
          }`}>
            {item.remaining_amount < 0
              ? `−${fmt.format(Math.abs(item.remaining_amount))}`
              : fmt.format(item.remaining_amount)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Budget Page ───────────────────────────────────────────────────────
type SortKey = "category" | "actual_amount" | "recommended_amount" | "remaining_amount";

export default function Budget() {
  const [data, setData] = useState<BudgetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [genMsg, setGenMsg] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("remaining_amount");
  const [sortAsc, setSortAsc] = useState(true);

  const fetchBudget = async () => {
    setLoading(true);
    try {
      const res = await api.get("/budget");
      setData(res.data);
    } catch {
      setError("Could not load budget. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenMsg("");
    try {
      const res = await api.post("/budget/generate");
      setData(res.data);
      setGenMsg("✓ Budget recomputed from 3-month transaction history.");
    } catch {
      setGenMsg("⚠ Could not recompute budget.");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => { fetchBudget(); }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sortedItems = data
    ? [...data.items].sort((a, b) => {
        const av = sortKey === "category" ? a.category : a[sortKey];
        const bv = sortKey === "category" ? b.category : b[sortKey];
        if (typeof av === "string" && typeof bv === "string")
          return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
      })
    : [];

  // KPI stats
  const totalRecommended = data?.items.reduce((s, i) => s + i.recommended_amount, 0) ?? 0;
  const totalSpent = data?.items.reduce((s, i) => s + i.actual_amount, 0) ?? 0;
  const overspendingCount = data?.items.filter(i => i.status === "overspending").length ?? 0;
  const onTrackCount = data?.items.filter(i => i.status === "on_track").length ?? 0;
  const underCount = data?.items.filter(i => i.status === "under").length ?? 0;
  const totalRemaining = totalRecommended - totalSpent;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-rose-600 font-medium">{error}</p>
          <button onClick={fetchBudget} className="mt-3 text-sm text-blue-600 hover:underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data?.month
              ? `${new Date(data.month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })} · Based on 3-month rolling average`
              : "No budget generated yet — click Recompute to generate one."}
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
        >
          {generating
            ? <><Loader2 size={14} className="animate-spin" /> Recomputing…</>
            : <><RefreshCw size={14} /> Recompute Budget</>}
        </button>
      </div>

      {/* Generation message */}
      {genMsg && (
        <div className={`text-sm px-4 py-2.5 rounded-xl border ${
          genMsg.startsWith("✓")
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          {genMsg}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <PiggyBank size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No budget data yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">
            Click "Recompute Budget" to generate recommendations from your transaction history.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Generate Budget
          </button>
        </div>
      ) : (
        <>
          {/* ── KPI Strip ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Budget",
                value: fmt.format(totalRecommended),
                sub: "3-month baseline",
                cls: "text-slate-900",
                bg: "bg-white",
              },
              {
                label: "Total Spent",
                value: fmt.format(totalSpent),
                sub: `${((totalSpent / totalRecommended) * 100).toFixed(0)}% of budget used`,
                cls: totalSpent > totalRecommended ? "text-rose-700" : "text-slate-900",
                bg: "bg-white",
              },
              {
                label: "Remaining",
                value: totalRemaining < 0
                  ? `−${fmt.format(Math.abs(totalRemaining))}`
                  : fmt.format(totalRemaining),
                sub: totalRemaining < 0 ? "Overall overspent" : "Still available",
                cls: totalRemaining < 0 ? "text-rose-700" : "text-emerald-700",
                bg: "bg-white",
              },
              {
                label: "Category Status",
                value: `${overspendingCount} over · ${onTrackCount} ok · ${underCount} under`,
                sub: `${data.items.length} categories tracked`,
                cls: "text-slate-700",
                bg: "bg-white",
              },
            ].map(({ label, value, sub, cls, bg }) => (
              <div key={label} className={`${bg} rounded-2xl border border-slate-200 p-5 shadow-sm`}>
                <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
                <p className={`text-xl font-bold tabular-nums ${cls}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* ── Status bar ── */}
          <div className="flex gap-3 flex-wrap">
            {[
              { status: "overspending", count: overspendingCount },
              { status: "on_track", count: onTrackCount },
              { status: "under", count: underCount },
            ].map(({ status, count }) => {
              const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
              const IconEl = cfg.icon;
              return (
                <div key={status} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cfg.border} ${cfg.bg} text-sm`}>
                  <IconEl size={14} className={cfg.iconCls} />
                  <span className={`font-medium ${cfg.pill.replace("bg-", "text-").split(" ")[1]}`}>
                    {count} {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Sort controls ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            {([
              { key: "remaining_amount", label: "Remaining" },
              { key: "actual_amount", label: "Spent" },
              { key: "recommended_amount", label: "Budget" },
              { key: "category", label: "Name" },
            ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  sortKey === key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
                {sortKey === key && (
                  sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                )}
              </button>
            ))}
          </div>

          {/* ── Budget Cards Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedItems.map(item => (
              <BudgetCard key={item.category} item={item} />
            ))}
          </div>

          {/* Footer note */}
          <p className="text-xs text-slate-400 pb-2">
            * Recommended amounts are computed as the rolling average of prior-month spending for each category.
            Categories with no prior history use ₹0 as the recommendation baseline.
          </p>
        </>
      )}
    </div>
  );
}
