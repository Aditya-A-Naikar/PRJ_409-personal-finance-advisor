import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  type PieLabelRenderProps,
} from "recharts";

// recharts exposes the nameKey-mapped value as `name` in the label callback.
// We render it only when the slice is big enough to label (>5%).
const renderPieLabel = (props: PieLabelRenderProps): string => {
  const pct = (props.percent ?? 0) as number;
  return pct > 0.05
    ? `${String(props.name ?? "")} ${(pct * 100).toFixed(0)}%`
    : "";
};
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Target,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface CategoryAmount { category: string; amount: number }
interface MonthTrend { month: string; income: number; expenses: number }
interface RecurringAlert {
  merchant: string; status: string; change_percentage: number;
  latest_amount: number; severity: string;
}
interface GoalSummary {
  id: number; name: string; progress_percentage: number;
  monthly_target: number; status: string;
}
interface BudgetSummary {
  category: string; recommended_amount: number;
  actual_amount: number; status: string;
}
interface DashboardData {
  month: string | null;
  total_balance: number; monthly_income: number;
  monthly_expenses: number; savings: number;
  category_breakdown: CategoryAmount[];
  monthly_trend: MonthTrend[];
  recurring_alerts: RecurringAlert[];
  goals: GoalSummary[];
  budget_status: BudgetSummary[];
  insights: string[];
}

// ── Palette ────────────────────────────────────────────────────────────────
const PIE_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#ea580c",
  "#16a34a", "#0891b2", "#ca8a04", "#4f46e5",
];

const STATUS_PILL: Record<string, string> = {
  overspending: "bg-rose-100 text-rose-700",
  on_track:     "bg-emerald-100 text-emerald-700",
  under:        "bg-slate-100 text-slate-500",
};

const GOAL_PILL: Record<string, string> = {
  feasible:     "bg-emerald-100 text-emerald-700",
  tight:        "bg-amber-100 text-amber-700",
  not_feasible: "bg-rose-100 text-rose-700",
};

// ── Small components ───────────────────────────────────────────────────────
function SummaryCard({
  icon: Icon, label, value, sub, iconClass,
}: {
  icon: React.ElementType; label: string; value: number;
  sub?: string; iconClass?: string;
}) {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Math.abs(value));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex items-center gap-1.5 text-xs font-medium mb-3 ${iconClass ?? "text-slate-500"}`}>
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">
        {value < 0 ? "-" : ""}{formatted}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-slate-700 mb-4">{children}</h2>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/dashboard")
      .then((res) => setData(res.data))
      .catch(() => setError("Could not load dashboard. Is the backend running?"));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-rose-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-slate-400 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const savingsRate = data.monthly_income > 0
    ? ((data.savings / data.monthly_income) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {data.month
            ? `Showing ${new Date(data.month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}`
            : "No transaction data yet"}
        </p>
      </div>

      {/* ── New account banner if no transactions ── */}
      {!data.month && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-800 text-base">Welcome to your financial dashboard! 🎉</h3>
            <p className="text-sm text-slate-600 mt-1">
              Your account is all set up. Add your first transaction or upload a bank statement CSV to populate charts, budget analysis, and AI financial recommendations.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/profile"
              className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition"
            >
              Set Income
            </Link>
            <Link
              to="/transactions"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition"
            >
              Add Transactions <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Wallet} label="Total Balance" value={data.total_balance}
          iconClass="text-blue-600"
        />
        <SummaryCard
          icon={TrendingUp} label="Monthly Income" value={data.monthly_income}
          iconClass="text-emerald-600"
        />
        <SummaryCard
          icon={TrendingDown} label="Monthly Expenses" value={data.monthly_expenses}
          iconClass="text-rose-600"
        />
        <SummaryCard
          icon={PiggyBank} label="Savings" value={data.savings}
          sub={`${savingsRate}% savings rate`}
          iconClass="text-violet-600"
        />
      </div>

      {/* ── AI Insights banner ── */}
      {data.insights.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-3">
            <Lightbulb size={16} />
            Rule-Based Insights
            <span className="text-xs font-normal text-amber-600 ml-1">
              (statistical observations — not AI-generated)
            </span>
          </div>
          <ul className="space-y-1.5">
            {data.insights.map((text, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                <span className="mt-0.5 text-amber-500">•</span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown pie */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionTitle>Spending by Category</SectionTitle>
          {data.category_breakdown.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
              No expenses this month
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.category_breakdown}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                  paddingAngle={2}
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {data.category_breakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: unknown) =>
                    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(v))
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Income vs expenses trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionTitle>Income vs Expenses (6 months)</SectionTitle>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.monthly_trend} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: unknown) =>
                  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(v))
                }
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone" dataKey="income" name="Income"
                stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }}
              />
              <Line
                type="monotone" dataKey="expenses" name="Expenses"
                stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom widgets row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recurring alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionTitle>Recurring Alerts</SectionTitle>
          {data.recurring_alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle2 size={16} />
              No recurring cost alerts
            </div>
          ) : (
            <ul className="space-y-3">
              {data.recurring_alerts.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <AlertTriangle
                    size={15}
                    className={`mt-0.5 shrink-0 ${
                      r.severity === "High" ? "text-rose-500" : "text-amber-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.merchant}</p>
                    <p className="text-xs text-slate-500">
                      {r.status === "new"
                        ? `New · ₹${r.latest_amount.toLocaleString("en-IN")}`
                        : `+${r.change_percentage.toFixed(0)}% · ${r.severity} severity`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Budget status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionTitle>Budget Status</SectionTitle>
          {data.budget_status.length === 0 ? (
            <p className="text-sm text-slate-400">No budget data — generate budget first.</p>
          ) : (
            <ul className="space-y-3.5">
              {data.budget_status.map((b, i) => {
                const pct = b.recommended_amount > 0
                  ? Math.min((b.actual_amount / b.recommended_amount) * 100, 120)
                  : 100;
                return (
                  <li key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-slate-700">{b.category}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          STATUS_PILL[b.status] ?? "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          b.status === "overspending" ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 text-right">
                      ₹{b.actual_amount.toLocaleString("en-IN")} /
                      ₹{b.recommended_amount.toLocaleString("en-IN")}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Goals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionTitle>Goal Progress</SectionTitle>
          {data.goals.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Target size={16} />
              No goals created yet
            </div>
          ) : (
            <ul className="space-y-4">
              {data.goals.map((g) => (
                <li key={g.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-700 truncate mr-2">{g.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        GOAL_PILL[g.status] ?? "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {g.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${g.progress_percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                    <span>{g.progress_percentage}% complete</span>
                    <span>₹{g.monthly_target.toLocaleString("en-IN")}/mo needed</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
