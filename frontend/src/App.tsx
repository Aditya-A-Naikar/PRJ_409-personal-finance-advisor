import { useEffect, useState } from "react";
import { Wifi, WifiOff, TrendingUp, Shield, Zap } from "lucide-react";
import api from "./services/api";

type BackendStatus = "checking" | "online" | "offline";

function StatusBadge({ status }: { status: BackendStatus }) {
  const map = {
    checking: {
      icon: <Zap className="w-4 h-4 animate-pulse" />,
      label: "Connecting…",
      classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    },
    online: {
      icon: <Wifi className="w-4 h-4" />,
      label: "Backend online",
      classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    },
    offline: {
      icon: <WifiOff className="w-4 h-4" />,
      label: "Backend unreachable",
      classes: "bg-red-500/10 text-red-400 border-red-500/30",
    },
  };

  const { icon, label, classes } = map[status];

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-500 ${classes}`}
    >
      {icon}
      {label}
    </span>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-3 hover:border-indigo-500/40 transition-all duration-300 hover:-translate-y-1 group">
      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-base text-slate-100">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("/health")
      .then((res) => {
        setStatus("online");
        setMessage(res.data.message ?? "OK");
      })
      .catch(() => {
        setStatus("offline");
        setMessage("Start the FastAPI server: uvicorn app.main:app --reload");
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.18) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-indigo-400" />
          <span className="font-bold text-lg tracking-tight">FinAdvisor</span>
        </div>
        <StatusBadge status={status} />
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative z-10">
        <div className="max-w-3xl w-full text-center space-y-8">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
            <Zap className="w-3.5 h-3.5" />
            PRJ_409 — Phase 1 scaffold
          </span>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Your{" "}
            <span className="gradient-text">AI Finance</span>
            <br />
            Advisor
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Track spending, forecast budgets, and get personalised AI-driven
            recommendations — all in one place.
          </p>

          {/* Backend message */}
          {message && (
            <p
              className={`text-sm font-mono px-4 py-2 rounded-lg inline-block transition-all duration-500 ${
                status === "online"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : status === "offline"
                  ? "bg-red-500/10 text-red-300"
                  : "bg-slate-700/50 text-slate-400"
              }`}
            >
              {message}
            </p>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <button
              id="get-started-btn"
              className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5"
            >
              Get Started
            </button>
            <button
              id="learn-more-btn"
              className="px-8 py-3.5 rounded-xl glass hover:border-indigo-500/40 font-semibold transition-all duration-200 hover:-translate-y-0.5"
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mt-20">
          <FeatureCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Smart Budgeting"
            desc="Automatically categorize transactions and track progress against your monthly budgets."
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            title="AI Insights"
            desc="Get natural-language explanations of your spending patterns and actionable tips."
          />
          <FeatureCard
            icon={<Shield className="w-5 h-5" />}
            title="Secure & Private"
            desc="Your financial data never leaves your control. Local-first with optional cloud sync."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-slate-600">
        PRJ_409 Personal Finance Advisor — Phase 1
      </footer>
    </div>
  );
}
