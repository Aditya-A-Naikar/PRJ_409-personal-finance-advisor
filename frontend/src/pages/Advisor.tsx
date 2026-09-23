import { useEffect, useState, useRef } from "react";
import {
  Sparkles, Send, Loader2,
  TrendingUp, PiggyBank, Target, BarChart2, Lightbulb,
} from "lucide-react";
import api from "../services/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface DashboardInsights {
  monthly_income: number;
  monthly_expenses: number;
  savings: number;
  total_balance: number;
  insights: string[];
  budget_status: { category: string; status: string; actual_amount: number; recommended_amount: number }[];
}

interface Message {
  role: "user" | "advisor";
  text: string;
  ts: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function buildAdvisorReply(question: string, d: DashboardInsights): string {
  const q = question.toLowerCase();
  const savingsRate = d.monthly_income > 0 ? ((d.savings / d.monthly_income) * 100).toFixed(1) : "0";
  const overspending = d.budget_status.filter(b => b.status === "overspending");
  const onTrack = d.budget_status.filter(b => b.status === "on_track");

  // Savings
  if (q.includes("sav") || q.includes("save")) {
    const rate = parseFloat(savingsRate);
    if (rate >= 20) return `Great job! Your current savings rate is ${savingsRate}% (${fmt.format(d.savings)}/mo). Financial advisors recommend 20%+, and you're already there. Consider channelling the surplus into long-term goals or an index fund SIP.`;
    if (rate >= 10) return `Your savings rate is ${savingsRate}% (${fmt.format(d.savings)}/mo) — decent, but there's room to improve. Review your top expense categories and try to push past the 20% mark.`;
    return `Your savings rate is only ${savingsRate}% (${fmt.format(d.savings)}/mo). That's below the recommended 20%. Start by trimming ${overspending.length > 0 ? overspending.map(o => o.category).slice(0, 2).join(" and ") : "discretionary"} spend.`;
  }

  // Budget / overspending
  if (q.includes("budget") || q.includes("oversp") || q.includes("spend")) {
    if (overspending.length === 0) return `Your budget is healthy — all ${d.budget_status.length} tracked categories are on track or under budget this month. Keep it up!`;
    const cats = overspending.map(o => `${o.category} (${fmt.format(o.actual_amount)} vs ${fmt.format(o.recommended_amount)} budget)`).join(", ");
    return `You are overspending in ${overspending.length} category${overspending.length > 1 ? "s" : ""}: ${cats}. These are areas where cutting back will have the most impact on your savings rate.`;
  }

  // Income / expenses
  if (q.includes("income") || q.includes("earn")) {
    return `Your monthly income stands at ${fmt.format(d.monthly_income)}. After avg monthly expenses of ${fmt.format(d.monthly_expenses)}, your net savings is ${fmt.format(d.savings)} (${savingsRate}% savings rate).`;
  }

  if (q.includes("expens") || q.includes("cost")) {
    return `Your average monthly expenses are ${fmt.format(d.monthly_expenses)}. That is ${d.monthly_income > 0 ? ((d.monthly_expenses / d.monthly_income) * 100).toFixed(0) : "N/A"}% of your income. ${overspending.length > 0 ? `Categories in the red: ${overspending.map(o => o.category).join(", ")}.` : "All categories are within budget."}`;
  }

  // Goals
  if (q.includes("goal") || q.includes("target") || q.includes("plan")) {
    return `Head to the Goals page to view your active savings targets. The feasibility engine checks whether your disposable income (${fmt.format(d.monthly_income - d.monthly_expenses)}/mo) covers your monthly goal commitments. If a goal is marked "Not Feasible", consider extending the deadline or reducing other expenses.`;
  }

  // Balance
  if (q.includes("balanc") || q.includes("net worth") || q.includes("wealth")) {
    return `Your current net transaction balance is ${fmt.format(d.total_balance)} (cumulative income minus all expenses recorded). Monthly net: ${fmt.format(d.savings)}.`;
  }

  // Advice / general
  if (q.includes("advi") || q.includes("tip") || q.includes("how") || q.includes("help") || q.includes("suggest")) {
    const tips: string[] = [];
    if (parseFloat(savingsRate) < 20) tips.push(`Increase your savings rate from ${savingsRate}% to 20%+`);
    if (overspending.length > 0) tips.push(`Reduce ${overspending[0].category} spend by ${fmt.format(overspending[0].actual_amount - overspending[0].recommended_amount)}`);
    if (onTrack.length > 0) tips.push(`Maintain ${onTrack[0].category} spend — it's on track`);
    tips.push("Run the drift analysis on the Recurring Costs page to catch silent price creep");
    tips.push("Use the Affordability Checker before any large purchase");
    return `Here are your top personalised tips:\n${tips.map((t, i) => `${i + 1}. ${t}.`).join("\n")}`;
  }

  // Insights from dashboard
  if (q.includes("insight") || q.includes("summary") || q.includes("overview")) {
    if (d.insights.length === 0) return "No automatic insights were generated this month — your finances look stable.";
    return `Auto-generated insights this month:\n${d.insights.map((ins, i) => `${i + 1}. ${ins}`).join("\n")}`;
  }

  // Recurring
  if (q.includes("subscri") || q.includes("recurr") || q.includes("drift")) {
    return "Visit the Recurring Costs page and run a Drift Analysis to detect subscriptions with price creep. The detector uses CoV-gated gap consistency and a composite drift score (magnitude × consistency × monotonic) to flag outliers.";
  }

  // Fallback — general contextual reply
  return `Based on your current data: income ${fmt.format(d.monthly_income)}/mo, expenses ${fmt.format(d.monthly_expenses)}/mo, savings ${fmt.format(d.savings)}/mo (${savingsRate}%). ${d.insights.length > 0 ? `Key insight: ${d.insights[0]}` : "Your finances are stable."} Ask me about savings, budget, goals, or expenses for detailed advice.`;
}

const SUGGESTED_QUESTIONS = [
  "How is my savings rate?",
  "Which categories am I overspending in?",
  "Give me your top tips to improve my finances",
  "What are my key insights this month?",
  "Can I afford a ₹50,000 purchase?",
  "How are my goals looking?",
];

// ── Chat Bubble ────────────────────────────────────────────────────────────
function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
          <Sparkles size={14} className="text-white" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? "bg-blue-600 text-white rounded-tr-sm"
          : "bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-sm"
      }`}>
        {msg.text}
      </div>
    </div>
  );
}

// ── Main Advisor Page ──────────────────────────────────────────────────────
export default function Advisor() {
  const [dashData, setDashData] = useState<DashboardInsights | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get("/dashboard")
      .then(res => {
        setDashData(res.data);
        setMessages([{
          role: "advisor",
          text: `Hello! 👋 I'm your AI Financial Advisor.\n\nHere's a quick snapshot of your finances:\n• Income: ${fmt.format(res.data.monthly_income)}/mo\n• Expenses: ${fmt.format(res.data.monthly_expenses)}/mo\n• Savings: ${fmt.format(res.data.savings)}/mo${res.data.insights.length > 0 ? `\n\n💡 Key insight: ${res.data.insights[0]}` : ""}\n\nAsk me anything about your finances!`,
          ts: Date.now(),
        }]);
      })
      .catch(() => setDataError("Could not load financial data. Is the backend running?"))
      .finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !dashData || thinking) return;
    const userMsg: Message = { role: "user", text: text.trim(), ts: Date.now() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setThinking(true);

    // Simulate "thinking" delay for authenticity
    await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    const reply = buildAdvisorReply(text, dashData);
    setMessages(m => [...m, { role: "advisor", text: reply, ts: Date.now() }]);
    setThinking(false);
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  if (loadingData) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-blue-600" />
        <p className="text-sm text-slate-400">Loading your financial data…</p>
      </div>
    </div>
  );

  if (dataError) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-rose-600 font-medium">{dataError}</p>
        <button onClick={() => window.location.reload()} className="mt-3 text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4 flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Financial Advisor</h1>
          <p className="text-sm text-slate-500 mt-0.5">Personalised advice powered by your transaction data</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-500 font-medium">Context-aware · Data up to date</span>
        </div>
      </div>

      {/* Quick stats strip */}
      {dashData && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: TrendingUp, label: "Income", value: fmt.format(dashData.monthly_income), cls: "text-emerald-700" },
            { icon: BarChart2, label: "Expenses", value: fmt.format(dashData.monthly_expenses), cls: "text-slate-900" },
            { icon: PiggyBank, label: "Savings", value: fmt.format(dashData.savings), cls: dashData.savings >= 0 ? "text-emerald-700" : "text-rose-700" },
            { icon: Target, label: "Balance", value: fmt.format(dashData.total_balance), cls: dashData.total_balance >= 0 ? "text-slate-900" : "text-rose-700" },
          ].map(({ icon: Icon, label, value, cls }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-sm text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-0.5">
                <Icon size={11} />{label}
              </div>
              <p className={`text-sm font-bold tabular-nums ${cls}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chat window */}
      <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map(msg => <ChatBubble key={msg.ts} msg={msg} />)}
          {thinking && (
            <div className="flex justify-start mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center mr-2 flex-shrink-0">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested questions */}
        {messages.length <= 1 && !thinking && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            <Lightbulb size={12} className="text-amber-500 mt-1 flex-shrink-0" />
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs bg-white border border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-200 p-3 bg-white">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask about your savings, budget, goals, expenses…"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={thinking}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
          <p className="text-xs text-slate-400 mt-1.5 text-center">
            Advice is derived from your transaction data. Not a substitute for professional financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
