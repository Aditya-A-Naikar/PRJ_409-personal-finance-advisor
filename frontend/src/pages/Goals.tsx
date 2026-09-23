import { useEffect, useState } from "react";
import {
  Target, PlusCircle, Trash2, PiggyBank, X, AlertCircle,
  CheckCircle2, AlertTriangle, Loader2, TrendingUp,
} from "lucide-react";
import api from "../services/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  monthly_target: number;
  status: "feasible" | "tight" | "not_feasible";
  remaining_amount: number;
  months_remaining: number;
  progress_percentage: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const STATUS_CONFIG = {
  feasible:     { label: "Feasible",     pill: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, iconCls: "text-emerald-500",  ring: "ring-emerald-200" },
  tight:        { label: "Tight",        pill: "bg-amber-100 text-amber-700",     icon: AlertTriangle, iconCls: "text-amber-500",   ring: "ring-amber-200"   },
  not_feasible: { label: "Not Feasible", pill: "bg-rose-100 text-rose-700",       icon: AlertCircle,   iconCls: "text-rose-500",    ring: "ring-rose-200"    },
};

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-blue-600" />
    </div>
  );
}

// ── Create Goal Modal ──────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const [form, setForm] = useState({
    name: "",
    target_amount: "",
    current_amount: "0",
    target_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const up = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/goals", {
        name: form.name,
        target_amount: parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount),
        target_date: form.target_date,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Could not create goal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"><X size={18} /></button>
        <div className="flex items-center gap-2 mb-5">
          <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><Target size={18} /></div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">New Financial Goal</h2>
            <p className="text-xs text-slate-500">Set a savings target and deadline</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Goal Name</label>
            <input type="text" required placeholder="e.g. Emergency Fund, New Laptop…" value={form.name} onChange={up("name")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Amount (₹)</label>
              <input type="number" required min="1" step="100" placeholder="500000" value={form.target_amount} onChange={up("target_amount")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Already Saved (₹)</label>
              <input type="number" min="0" step="100" placeholder="0" value={form.current_amount} onChange={up("current_amount")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Target Date</label>
            <input type="date" required value={form.target_date} onChange={up("target_date")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} />{error}
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" />Creating…</> : "Create Goal"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Contribute Modal ───────────────────────────────────────────────────────
function ContributeModal({ goal, onClose, onDone }: { goal: Goal; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const remaining = goal.target_amount - goal.current_amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.patch(`/goals/${goal.id}/contribute`, { amount: parseFloat(amount) });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Contribution failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"><X size={18} /></button>
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl"><PiggyBank size={18} /></div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Contribute to Goal</h2>
            <p className="text-xs text-slate-500">{goal.name}</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm text-slate-600">
          <div className="flex justify-between"><span>Already saved</span><span className="font-semibold text-slate-900">{fmt.format(goal.current_amount)}</span></div>
          <div className="flex justify-between mt-1"><span>Still needed</span><span className="font-semibold text-rose-600">{fmt.format(remaining)}</span></div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Amount to add (₹)</label>
            <input type="number" required min="1" step="100" max={remaining} placeholder={`Max ${fmt.format(remaining)}`}
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><PiggyBank size={14} />Add Funds</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Goal Card ──────────────────────────────────────────────────────────────
function GoalCard({ goal, onRefresh }: { goal: Goal; onRefresh: () => void }) {
  const [showContribute, setShowContribute] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cfg = STATUS_CONFIG[goal.status];
  const Icon = cfg.icon;
  const pct = Math.min(goal.progress_percentage, 100);

  const handleDelete = async () => {
    if (!confirm(`Delete goal "${goal.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try { await api.delete(`/goals/${goal.id}`); onRefresh(); }
    catch { alert("Could not delete goal."); setDeleting(false); }
  };

  const progressColor =
    goal.status === "feasible" ? "bg-emerald-500" :
    goal.status === "tight"    ? "bg-amber-500" :
                                 "bg-rose-500";

  return (
    <>
      <div className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all ring-1 ${cfg.ring}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="font-semibold text-slate-900 truncate">{goal.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.pill}`}>{cfg.label}</span>
              <span className="text-xs text-slate-400">{goal.months_remaining}mo left</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Icon size={18} className={cfg.iconCls} />
            <button onClick={handleDelete} disabled={deleting}
              className="ml-1 text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-50">
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Progress ring / bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{fmt.format(goal.current_amount)} saved</span>
            <span className="font-semibold text-slate-700">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>₹0</span>
            <span>{fmt.format(goal.target_amount)}</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs mb-4">
          <div>
            <p className="text-slate-400 mb-0.5">Remaining</p>
            <p className="font-semibold text-slate-800">{fmt.format(goal.remaining_amount)}</p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Monthly needed</p>
            <p className={`font-semibold ${goal.status === "not_feasible" ? "text-rose-600" : "text-slate-800"}`}>
              {fmt.format(goal.monthly_target)}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-slate-400 mb-0.5">Target date</p>
            <p className="font-semibold text-slate-800">
              {new Date(goal.target_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        <button onClick={() => setShowContribute(true)}
          className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 rounded-xl text-sm transition-colors">
          <PiggyBank size={14} /> Contribute
        </button>
      </div>

      {showContribute && (
        <ContributeModal goal={goal} onClose={() => setShowContribute(false)} onDone={onRefresh} />
      )}
    </>
  );
}

// ── Main Goals Page ────────────────────────────────────────────────────────
export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await api.get("/goals");
      setGoals(res.data);
    } catch {
      setError("Could not load goals. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved  = goals.reduce((s, g) => s + g.current_amount, 0);
  const overallPct  = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-rose-600 font-medium">{error}</p>
        <button onClick={fetchGoals} className="mt-3 text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goals</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Loading…" : `${goals.length} active goal${goals.length !== 1 ? "s" : ""} · Feasibility gated by disposable income`}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
          <PlusCircle size={15} /> New Goal
        </button>
      </div>

      {loading ? <Spinner /> : goals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <Target size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No goals yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">Start by creating your first financial goal — a holiday fund, emergency fund, or a big purchase.</p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors">
            <PlusCircle size={14} /> Create First Goal
          </button>
        </div>
      ) : (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Targets",  value: fmt.format(totalTarget), sub: `${goals.length} goals`, cls: "text-slate-900" },
              { label: "Total Saved",    value: fmt.format(totalSaved),  sub: `${overallPct.toFixed(0)}% overall`, cls: "text-emerald-700" },
              { label: "Still Needed",   value: fmt.format(totalTarget - totalSaved), sub: "across all goals", cls: "text-rose-600" },
              { label: "Feasibility",
                value: `${goals.filter(g=>g.status==="feasible").length}F · ${goals.filter(g=>g.status==="tight").length}T · ${goals.filter(g=>g.status==="not_feasible").length}NF`,
                sub: "Feasible · Tight · Not Feasible", cls: "text-slate-700" },
            ].map(({ label, value, sub, cls }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
                <p className={`text-xl font-bold tabular-nums ${cls}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Overall Progress */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <TrendingUp size={15} className="text-blue-600" /> Overall Savings Progress
              </div>
              <span className="text-sm font-bold text-slate-900">{overallPct.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(overallPct, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1.5">
              <span>{fmt.format(totalSaved)} saved</span>
              <span>{fmt.format(totalTarget)} total target</span>
            </div>
          </div>

          {/* Goals Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map(g => <GoalCard key={g.id} goal={g} onRefresh={fetchGoals} />)}
          </div>
        </>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={fetchGoals} />}
    </div>
  );
}
