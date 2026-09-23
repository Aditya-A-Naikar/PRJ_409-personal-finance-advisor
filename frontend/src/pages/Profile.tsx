import { useState } from "react";
import {
  User, Banknote, CheckCircle2, Loader2, Save,
  Mail, AtSign, Shield, Calendar,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function Profile() {
  const { user, setUser } = useAuth();
  const [income, setIncome]   = useState(user?.monthly_income?.toString() ?? "");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(income.replace(/,/g, ""));
    if (isNaN(val) || val < 0) { setError("Please enter a valid amount."); return; }
    setError("");
    setSaving(true);
    setSaved(false);
    try {
      const res = await api.patch("/auth/me", { monthly_income: val });
      if (setUser) setUser(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Could not update income.");
    } finally {
      setSaving(false);
    }
  };

  const PRESETS = [20000, 35000, 55000, 80000, 120000, 200000];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account details and monthly income</p>
      </div>

      {/* Account info card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <User size={14} className="text-blue-600" /> Account Details
        </h2>
        <div className="space-y-3">
          {[
            { icon: User,     label: "Full Name",  value: user?.name     ?? "—" },
            { icon: AtSign,   label: "Username",   value: user?.username ?? "—" },
            { icon: Mail,     label: "Email",      value: user?.email    ?? "—" },
            { icon: Shield,   label: "Role",       value: user?.role     ?? "USER" },
            { icon: Calendar, label: "User ID",    value: user?.user_id  ?? "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Icon size={14} className="text-slate-400" />
                {label}
              </div>
              <span className="text-sm font-medium text-slate-900">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Income update card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
          <Banknote size={14} className="text-emerald-600" /> Monthly Take-Home Income
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Used for budget recommendations, goal feasibility, and affordability checks.
          {user?.monthly_income ? ` Currently set to ${fmt.format(user.monthly_income)}/mo.` : " Not set yet."}
        </p>

        {/* Preset buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PRESETS.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setIncome(v.toString())}
              className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                income === v.toString()
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {fmt.format(v)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Custom amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="500"
                placeholder="Enter monthly income…"
                value={income}
                onChange={e => setIncome(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {saved && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} /> Income updated! Budget and goal calculations will now use this value.
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !income}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" />Saving…</>
              : <><Save size={14} />Update Income</>}
          </button>
        </form>
      </div>

      {/* What income affects */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
        <h3 className="text-xs font-semibold text-slate-700 mb-3">What your income affects:</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          {[
            "💰 Budget recommendations (3-month rolling avg)",
            "🎯 Goal feasibility — Feasible / Tight / Not Feasible",
            "🛒 Affordability checker — disposable income calc",
            "🤖 AI Advisor — personalised savings rate advice",
          ].map(item => (
            <div key={item} className="bg-white rounded-lg p-2.5 border border-slate-200">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
