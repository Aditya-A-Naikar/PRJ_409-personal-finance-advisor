import { useEffect, useState } from "react";
import {
  AlertCircle, TrendingUp, Minus, Loader2,
  BarChart2, Zap,
} from "lucide-react";
import api from "../services/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface RecurringExpense {
  id: number;
  merchant: string;
  category: string | null;
  average_amount: number;
  latest_amount: number;
  change_percentage: number;
  frequency: string;
  drift_score: number;
  status: string;
  severity: string;
  explanation: string;
}

interface AnalyzeSummary {
  merchants_analyzed: number;
  recurring_found: number;
  increasing: number;
  new: number;
  stable: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const SEVERITY_CONFIG: Record<string, { bar: string; pill: string; icon: React.ElementType; iconCls: string }> = {
  High:   { bar: "bg-rose-500",    pill: "bg-rose-100 text-rose-700",    icon: AlertCircle, iconCls: "text-rose-500"    },
  Medium: { bar: "bg-amber-400",   pill: "bg-amber-100 text-amber-700",  icon: TrendingUp,  iconCls: "text-amber-500"  },
  Low:    { bar: "bg-emerald-400", pill: "bg-emerald-100 text-emerald-700", icon: Minus,    iconCls: "text-emerald-500" },
};

const STATUS_LABELS: Record<string, string> = {
  increasing: "Increasing",
  stable:     "Stable",
  new:        "New",
};

const FREQ_LABELS: Record<string, string> = {
  weekly:    "🗓 Weekly",
  monthly:   "📆 Monthly",
  quarterly: "📅 Quarterly",
  irregular: "🔀 Irregular",
};

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-blue-600" />
    </div>
  );
}

// ── Recurring Card ─────────────────────────────────────────────────────────
function RecurringCard({ item }: { item: RecurringExpense }) {
  const sev = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.Low;
  const SevIcon = sev.icon;
  const changePct = item.change_percentage;
  const isUp = changePct > 0;
  const driftWidth = Math.min(item.drift_score * 100, 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600 flex-shrink-0">
            {item.merchant[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{item.merchant}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sev.pill}`}>
                {item.severity} Severity
              </span>
              {item.category && (
                <span className="text-xs text-slate-400">{item.category}</span>
              )}
            </div>
          </div>
        </div>
        <SevIcon size={18} className={`flex-shrink-0 ml-2 ${sev.iconCls}`} />
      </div>

      {/* Drift score bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500">Drift Score</span>
          <span className="font-semibold text-slate-700">{item.drift_score.toFixed(3)}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${sev.bar} transition-all duration-500`} style={{ width: `${driftWidth}%` }} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-slate-100 mb-3">
        <div>
          <p className="text-slate-400 mb-0.5">Avg Price</p>
          <p className="font-semibold text-slate-800">{fmt.format(item.average_amount)}</p>
        </div>
        <div>
          <p className="text-slate-400 mb-0.5">Latest</p>
          <p className="font-semibold text-slate-800">{fmt.format(item.latest_amount)}</p>
        </div>
        <div>
          <p className="text-slate-400 mb-0.5">Change</p>
          <p className={`font-bold ${isUp ? "text-rose-600" : "text-emerald-600"}`}>
            {isUp ? "+" : ""}{changePct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{FREQ_LABELS[item.frequency] ?? item.frequency}</span>
        <span className={`font-medium px-2 py-0.5 rounded-full ${
          item.status === "increasing" ? "bg-rose-50 text-rose-700" :
          item.status === "new"        ? "bg-blue-50 text-blue-700" :
                                         "bg-slate-100 text-slate-600"
        }`}>
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
      </div>

      {/* Explanation */}
      <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
        {item.explanation}
      </p>
    </div>
  );
}

// ── Main Recurring Costs Page ──────────────────────────────────────────────
export default function Recurring() {
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState<AnalyzeSummary | null>(null);
  const [error, setError] = useState("");
  const [analyzeMsg, setAnalyzeMsg] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"All" | "High" | "Medium" | "Low">("All");

  const fetchRecurring = async () => {
    setLoading(true);
    try {
      const res = await api.get("/recurring");
      setItems(res.data);
    } catch {
      setError("Could not load recurring costs. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeMsg("");
    try {
      const res = await api.post("/recurring/analyze");
      setSummary(res.data);
      setAnalyzeMsg("✓ Analysis complete. Results updated.");
      await fetchRecurring();
    } catch {
      setAnalyzeMsg("⚠ Analysis failed. Check backend.");
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => { fetchRecurring(); }, []);

  const filtered = severityFilter === "All" ? items : items.filter(i => i.severity === severityFilter);
  const totalMonthly = items.filter(i => i.frequency === "monthly").reduce((s, i) => s + i.latest_amount, 0);
  const highCount = items.filter(i => i.severity === "High").length;
  const increasingCount = items.filter(i => i.status === "increasing").length;

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-rose-600 font-medium">{error}</p>
        <button onClick={fetchRecurring} className="mt-3 text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recurring Costs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Subscription drift detector — gap consistency gated (CoV &lt; 0.50 filtered out)
          </p>
        </div>
        <button onClick={handleAnalyze} disabled={analyzing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
          {analyzing ? <><Loader2 size={14} className="animate-spin" />Analyzing…</> : <><Zap size={14} />Run Drift Analysis</>}
        </button>
      </div>

      {analyzeMsg && (
        <div className={`text-sm px-4 py-2.5 rounded-xl border ${
          analyzeMsg.startsWith("✓") ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          {analyzeMsg}
          {summary && (
            <span className="ml-3 text-xs opacity-70">
              {summary.merchants_analyzed} analyzed · {summary.recurring_found} recurring · {summary.increasing} increasing · {summary.new} new · {summary.stable} stable
            </span>
          )}
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Subscriptions Tracked", value: items.length, sub: "passed gap filter", cls: "text-slate-900" },
              { label: "Monthly Commit",    value: fmt.format(totalMonthly), sub: "monthly recurring total", cls: "text-slate-900" },
              { label: "Increasing Costs",  value: increasingCount, sub: "price creep detected",  cls: increasingCount > 0 ? "text-rose-700" : "text-slate-900" },
              { label: "High Severity",     value: highCount,        sub: "require attention",     cls: highCount > 0 ? "text-rose-700" : "text-emerald-700" },
            ].map(({ label, value, sub, cls }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
                <p className={`text-xl font-bold tabular-nums ${cls}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
              <BarChart2 size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">No recurring expenses detected yet</p>
              <p className="text-sm text-slate-400 mt-1 mb-5">
                Click "Run Drift Analysis" to scan your transaction history for recurring payment patterns.
              </p>
              <button onClick={handleAnalyze} disabled={analyzing}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors">
                {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Run Analysis
              </button>
            </div>
          ) : (
            <>
              {/* Severity filter tabs */}
              <div className="flex gap-3 flex-wrap items-center">
                <span className="text-xs text-slate-500 font-medium">Filter:</span>
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                  {(["All", "High", "Medium", "Low"] as const).map(s => (
                    <button key={s} onClick={() => setSeverityFilter(s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        severityFilter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}>
                      {s} {s !== "All" && `(${items.filter(i => i.severity === s).length})`}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered
                  .sort((a, b) => b.drift_score - a.drift_score)
                  .map(item => <RecurringCard key={item.id} item={item} />)}
              </div>

              <p className="text-xs text-slate-400 pb-2">
                * Merchants are classified as recurring only if gap Coefficient of Variation (CoV) &lt; 0.50, excluding irregular purchases (food delivery, ride-hailing). Drift score = 0.7×magnitude + 0.1×consistency + 0.2×monotonic.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
