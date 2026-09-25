import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Banknote, CheckCircle2, Loader2, ArrowRight,
  Sparkles, PiggyBank, Target, BarChart2,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const PRESET_INCOMES = [
  { label: "₹20,000", value: 20000, sub: "Entry level / Intern" },
  { label: "₹35,000", value: 35000, sub: "Junior professional" },
  { label: "₹55,000", value: 55000, sub: "Mid-level professional" },
  { label: "₹80,000", value: 80000, sub: "Senior professional" },
  { label: "₹1,20,000", value: 120000, sub: "Manager / Lead" },
  { label: "₹2,00,000+", value: 200000, sub: "Director / Freelancer" },
];

const FEATURES = [
  { icon: BarChart2, text: "AI-powered budget recommendations" },
  { icon: Target,    text: "Goal feasibility & savings planning" },
  { icon: PiggyBank, text: "Affordability checks before purchases" },
  { icon: Sparkles,  text: "Personalised financial advisor chat" },
];

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [income, setIncome]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  const handleSave = async (amount: number) => {
    if (amount <= 0) { setError("Please enter a valid income amount."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await api.patch("/auth/me", { monthly_income: amount });
      if (setUser) setUser(res.data);
      setDone(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Could not save income. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(income.replace(/,/g, ""));
    handleSave(val);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <CheckCircle2 size={56} className="text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">All set! 🎉</h2>
          <p className="text-slate-500 text-sm">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-1 rounded-full shadow-sm">
              <Wallet size={14} />
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">ArthaSense</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Let's set up your profile. Your monthly income is used for budget recommendations,
            goal feasibility checks, and affordability analysis.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Income input card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl">
                <Banknote size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Monthly Take-Home Income</h2>
                <p className="text-xs text-slate-500">After taxes and deductions</p>
              </div>
            </div>

            {/* Preset buttons */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {PRESET_INCOMES.map(({ label, value, sub }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIncome(value.toString())}
                  disabled={loading}
                  className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    income === value.toString()
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="font-semibold">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </button>
              ))}
            </div>

            {/* Custom input */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Or enter exact amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    placeholder="e.g. 55000"
                    value={income}
                    onChange={e => setIncome(e.target.value)}
                    disabled={loading}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!income || loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors"
              >
                {loading
                  ? <><Loader2 size={15} className="animate-spin" />Saving…</>
                  : <><ArrowRight size={15} />Go to Dashboard</>}
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
              >
                Skip for now — I'll set it later in Profile
              </button>
            </form>
          </div>

          {/* Features panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">
                Your income unlocks all features:
              </h3>
              <div className="space-y-3">
                {FEATURES.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className="text-blue-600" />
                    </div>
                    <p className="text-sm text-slate-700">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-600 rounded-2xl p-5 text-white">
              <h3 className="font-semibold text-sm mb-2">🔒 Your data is private</h3>
              <p className="text-xs text-blue-200 leading-relaxed">
                All financial data is stored locally on your device. Your income and transactions
                are never shared with third parties. This app is for personal finance management only.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs text-slate-500 font-medium mb-2">What happens next?</p>
              <ol className="space-y-1.5">
                {[
                  "Set your income here",
                  "Add your first transactions (or upload a CSV)",
                  "Generate your AI budget recommendations",
                  "Ask the AI Advisor anything about your finances",
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
