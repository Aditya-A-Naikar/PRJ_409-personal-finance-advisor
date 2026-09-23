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


  const q = question.toLowerCase().trim();
  const savingsRate = d.monthly_income > 0 ? ((d.savings / d.monthly_income) * 100).toFixed(1) : "0";
  const overspending = d.budget_status.filter(b => b.status === "overspending");
  const onTrack     = d.budget_status.filter(b => b.status === "on_track");
  const disposable  = d.monthly_income - d.monthly_expenses;

  const has = (...words: string[]) => words.some(w => q.includes(w));

  // ── Greetings ──────────────────────────────────────────────────────────────
  if (has("hi", "hello", "hey", "hii", "helo", "namaste", "good morning", "good evening", "good night", "sup", "yo")) {
    return `Hi there! 👋 I'm your AI Financial Advisor, and I have full context of your finances.\n\nHere's where you stand right now:\n• Monthly income: ${fmt.format(d.monthly_income)}\n• Monthly expenses: ${fmt.format(d.monthly_expenses)}\n• Net savings: ${fmt.format(d.savings)} (${savingsRate}%)\n• Net balance: ${fmt.format(d.total_balance)}\n${overspending.length > 0 ? `\n⚠️ You're currently overspending in: ${overspending.map(o => o.category).join(", ")}` : "\n✅ All budget categories are on track!"}\n\nWhat would you like to know? Ask me about savings, budget, goals, a purchase you're considering, or anything finance-related!`;
  }

  // ── Thanks / goodbye ───────────────────────────────────────────────────────
  if (has("thank", "thanks", "bye", "goodbye", "ok thanks", "great", "awesome", "nice", "cool", "perfect")) {
    return `You're welcome! 😊 Feel free to ask anytime — I'm always here with your financial data loaded. A quick reminder: your savings rate is ${savingsRate}%, and ${overspending.length > 0 ? `you have ${overspending.length} overspending category${overspending.length > 1 ? "s" : ""} to watch` : "all categories are on track"}. Keep it up! 💪`;
  }

  // ── Purchase intent ("want to buy", "should I buy", "can I afford") ────────
  const purchaseKeywords = ["want to buy", "should i buy", "i want to buy", "thinking of buying", "planning to buy", "can i buy", "afford", "purchase", "buy a", "get a", "phone", "laptop", "bike", "car", "tv", "iphone", "macbook", "camera", "watch", "gadget", "trip", "vacation", "holiday", "flight", "travel", "clothes", "furniture", "rent a"];
  if (has(...purchaseKeywords)) {
    // Try to extract an amount from the question
    const amountMatch = question.match(/[₹rs.\s]*(\d[\d,]*)/i);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, "")) : null;

    // Try to identify the item
    const items = ["phone", "laptop", "macbook", "iphone", "bike", "car", "tv", "camera", "watch", "trip", "vacation", "flight", "furniture", "gadget", "clothes"];
    const item  = items.find(i => q.includes(i)) ?? "item";

    if (amount) {
      const canAfford = amount <= disposable;
      const pct       = disposable > 0 ? ((amount / disposable) * 100).toFixed(0) : "N/A";
      return `${canAfford ? "✅ Looks affordable!" : "⚠️ That might be a stretch."}\n\n📊 Quick affordability check for "${item}" at ${fmt.format(amount)}:\n• Your monthly disposable income: ${fmt.format(disposable)}\n• This purchase is ${pct}% of your disposable income\n• Available after purchase: ${fmt.format(disposable - amount)}\n\n${canAfford
        ? `Since it's within your disposable income, you can consider this — but make sure it won't impact your goal commitments. Use the Affordability Checker page for a full analysis including your safety buffer.`
        : `This exceeds your monthly disposable income. You'd need to save up over ${Math.ceil(amount / (disposable > 0 ? disposable : 1))} months. Use the Affordability Checker page for a detailed breakdown.`}`;
    }

    return `Great question! Before buying that ${item}, here's your financial snapshot:\n• Monthly disposable income: ${fmt.format(disposable)}\n• Current savings: ${fmt.format(d.savings)}/mo (${savingsRate}%)\n\nFor a precise affordability answer including your safety buffer and goal commitments, head to the **Affordability Checker** page and enter the purchase amount. It will instantly tell you if it's affordable with a full breakdown.`;
  }

  // ── Savings ────────────────────────────────────────────────────────────────
  if (has("sav", "save", "saving", "piggy", "how much do i save")) {
    const rate = parseFloat(savingsRate);
    if (rate >= 20) return `🎉 Excellent savings discipline! Your savings rate is ${savingsRate}% — ${fmt.format(d.savings)}/mo. Financial advisors recommend 20%+, and you're already there.\n\nSuggestion: Channel the surplus into a SIP or index fund to beat inflation. If you have active goals, you could accelerate them too.`;
    if (rate >= 10) return `📈 Your savings rate is ${savingsRate}% (${fmt.format(d.savings)}/mo) — decent, but there's room to improve.\n\nTo reach the recommended 20%:\n• You'd need to save an extra ${fmt.format(d.monthly_income * 0.2 - d.savings)}/mo\n• Focus on trimming: ${overspending.length > 0 ? overspending.map(o => o.category).slice(0, 2).join(", ") : "discretionary categories"}`;
    return `⚠️ Your savings rate is only ${savingsRate}% (${fmt.format(d.savings)}/mo) — below the recommended 20%.\n\nAction plan:\n1. Target 20% = ${fmt.format(d.monthly_income * 0.2)}/mo\n2. Gap to close: ${fmt.format(d.monthly_income * 0.2 - d.savings)}/mo\n3. Biggest overspend: ${overspending.length > 0 ? `${overspending[0].category} (${fmt.format(overspending[0].actual_amount - overspending[0].recommended_amount)} over budget)` : "no major overspend detected"}`;
  }

  // ── Budget / overspending ──────────────────────────────────────────────────
  if (has("budget", "oversp", "over budget", "categories", "on track", "under budget", "where am i spending", "where is my money")) {
    if (d.budget_status.length === 0) return "No budget has been generated yet. Go to the Budget page and click 'Recompute Budget' to generate recommendations from your transaction history.";
    if (overspending.length === 0) return `✅ Your budget is perfectly healthy! All ${d.budget_status.length} tracked categories are on track or under budget.\n\nTop categories:\n${onTrack.slice(0, 3).map(o => `• ${o.category}: ${fmt.format(o.actual_amount)} of ${fmt.format(o.recommended_amount)} budget`).join("\n")}`;
    const catLines = overspending.map(o => `• ${o.category}: spent ${fmt.format(o.actual_amount)} vs ${fmt.format(o.recommended_amount)} budget (${fmt.format(o.actual_amount - o.recommended_amount)} over)`).join("\n");
    return `⚠️ You're overspending in ${overspending.length} category${overspending.length > 1 ? "s" : ""}:\n${catLines}\n\nCutting these down to budget would free up ${fmt.format(overspending.reduce((s, o) => s + o.actual_amount - o.recommended_amount, 0))}/mo and boost your savings rate to ${((d.savings + overspending.reduce((s,o) => s + o.actual_amount - o.recommended_amount, 0)) / d.monthly_income * 100).toFixed(1)}%.`;
  }

  // ── Specific category queries ──────────────────────────────────────────────
  const categoryMap: Record<string, string[]> = {
    Food:          ["food", "eating", "restaurant", "zomato", "swiggy", "groceries", "lunch", "dinner", "breakfast", "meal"],
    Shopping:      ["shopping", "amazon", "flipkart", "clothes", "fashion", "retail"],
    Transport:     ["transport", "travel", "uber", "ola", "fuel", "petrol", "commute", "cab"],
    Subscription:  ["subscription", "netflix", "spotify", "streaming", "ott", "prime"],
    Utilities:     ["utilities", "electricity", "water", "internet", "bill"],
    Rent:          ["rent", "house", "apartment", "flat", "landlord"],
    EMI:           ["emi", "loan", "equated"],
    Healthcare:    ["health", "medical", "doctor", "medicine", "hospital", "pharmacy"],
    Entertainment: ["entertainment", "movie", "gaming", "party", "outing"],
    Education:     ["education", "course", "class", "learning", "book", "school", "college"],
  };
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (has(...keywords)) {
      const budget  = d.budget_status.find(b => b.category === cat);
      if (budget) {
        const diff   = budget.actual_amount - budget.recommended_amount;
        const status = diff > 0 ? `⚠️ ${fmt.format(diff)} over budget` : `✅ ${fmt.format(-diff)} under budget`;
        return `${cat} spending breakdown:\n• Spent this month: ${fmt.format(budget.actual_amount)}\n• Budget recommendation: ${fmt.format(budget.recommended_amount)}\n• Status: ${status}\n\n${diff > 0 ? `Cutting ${cat} spend to your budget would save you ${fmt.format(diff)}/mo.` : `You're managing ${cat} spend well — keep it up!`}`;
      }
      return `I don't have specific budget data for ${cat} yet. Go to the Budget page and click 'Recompute Budget' to generate category-level recommendations.`;
    }
  }

  // ── Income ─────────────────────────────────────────────────────────────────
  if (has("income", "earn", "salary", "how much do i make", "how much i earn")) {
    return `💰 Income summary:\n• Monthly income: ${fmt.format(d.monthly_income)}\n• Monthly expenses: ${fmt.format(d.monthly_expenses)} (${d.monthly_income > 0 ? ((d.monthly_expenses / d.monthly_income) * 100).toFixed(0) : "N/A"}% of income)\n• Disposable income: ${fmt.format(disposable)}\n• Net savings rate: ${savingsRate}%`;
  }

  // ── Expenses ───────────────────────────────────────────────────────────────
  if (has("expens", "spending", "how much i spend", "outgoings", "outflow", "monthly cost")) {
    return `📊 Monthly expense breakdown:\n• Total expenses: ${fmt.format(d.monthly_expenses)} (${d.monthly_income > 0 ? ((d.monthly_expenses / d.monthly_income) * 100).toFixed(0) : "N/A"}% of income)\n• Categories over budget: ${overspending.length}\n• Biggest overspend: ${overspending.length > 0 ? `${overspending[0].category} by ${fmt.format(overspending[0].actual_amount - overspending[0].recommended_amount)}` : "None — all good!"}\n\nFor full details, visit the Budget and Transactions pages.`;
  }

  // ── Goals ──────────────────────────────────────────────────────────────────
  if (has("goal", "target", "dream", "saving for", "emergency fund", "holiday fund")) {
    const di = fmt.format(disposable);
    return `🎯 Goals & feasibility:\nYour disposable income (after expenses) is ${di}/mo. The Goals page checks if this covers your monthly goal commitments.\n\nTips:\n• If a goal is "Not Feasible", extend the deadline or reduce expenses\n• If it's "Tight", consider pausing lower-priority goals\n• Run the Affordability Checker before making large purchases that compete with your goals`;
  }

  // ── Balance / net worth ────────────────────────────────────────────────────
  if (has("balanc", "net worth", "wealth", "total", "how much money", "how much do i have")) {
    return `🏦 Your financial position:\n• Net transaction balance: ${fmt.format(d.total_balance)} (cumulative income − all expenses)\n• Monthly net: +${fmt.format(d.savings)}\n• Savings rate: ${savingsRate}%\n\n${d.total_balance > 0 ? "You're in the positive — great position to start or accelerate your goals!" : "Your balance is negative — focus on reducing expenses to turn this around."}`;
  }

  // ── Advice / tips ──────────────────────────────────────────────────────────
  if (has("advi", "tip", "suggest", "help me", "what should", "how can i", "how do i", "improve", "better")) {
    const tips: string[] = [];
    const rate = parseFloat(savingsRate);
    if (rate < 20) tips.push(`Boost your savings rate from ${savingsRate}% → 20% (need ${fmt.format(d.monthly_income * 0.2 - d.savings)} more/mo)`);
    if (overspending.length > 0) tips.push(`Cut ${overspending[0].category} by ${fmt.format(overspending[0].actual_amount - overspending[0].recommended_amount)} to match budget`);
    if (onTrack.length > 0)      tips.push(`Keep ${onTrack[0].category} spend on track — it's at budget`);
    tips.push("Run Drift Analysis on Recurring Costs to catch silent price creep");
    tips.push("Use the Affordability Checker before any large purchase");
    tips.push("Review your goals on the Goals page and check feasibility status");
    return `💡 Your personalised action plan:\n${tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
  }

  // ── Insights / summary ─────────────────────────────────────────────────────
  if (has("insight", "summary", "overview", "report", "monthly report", "how am i doing", "doing")) {
    const insightText = d.insights.length > 0
      ? d.insights.map((ins, i) => `${i + 1}. ${ins}`).join("\n")
      : "No specific alerts this month — your finances look stable!";
    return `📋 Monthly financial summary:\n• Income: ${fmt.format(d.monthly_income)}\n• Expenses: ${fmt.format(d.monthly_expenses)}\n• Savings: ${fmt.format(d.savings)} (${savingsRate}%)\n• Balance: ${fmt.format(d.total_balance)}\n• Over-budget categories: ${overspending.length}\n\n🔍 Auto-insights:\n${insightText}`;
  }

  // ── Recurring / subscriptions ──────────────────────────────────────────────
  if (has("subscri", "recurr", "drift", "netflix", "price creep", "hidden cost", "monthly charge")) {
    return "🔁 Recurring costs are auto-detected from your transaction history using a gap-consistency algorithm.\n\nHow to use it:\n1. Go to the Recurring Costs page\n2. Click 'Run Drift Analysis'\n3. Review cards sorted by drift score — High severity ones need attention\n\nThe drift score combines price magnitude, consistency of increase, and monotonic growth to flag subscriptions quietly raising prices.";
  }

  // ── Fallback — smarter contextual reply ────────────────────────────────────
  const rate = parseFloat(savingsRate);
  const healthEmoji = rate >= 20 ? "🟢" : rate >= 10 ? "🟡" : "🔴";
  return `${healthEmoji} I'm not sure I understood that exactly, but here's your current snapshot:\n• Income: ${fmt.format(d.monthly_income)}/mo · Expenses: ${fmt.format(d.monthly_expenses)}/mo\n• Savings: ${fmt.format(d.savings)}/mo (${savingsRate}%)\n${overspending.length > 0 ? `• ⚠️ Overspending in: ${overspending.map(o => o.category).join(", ")}` : "• ✅ All categories on track"}\n\nTry asking:\n• "How is my savings rate?"\n• "I want to buy a ₹30,000 laptop — can I afford it?"\n• "Which categories am I overspending in?"\n• "Give me your top tips"\n• "What are my key insights?"`;
}

const SUGGESTED_QUESTIONS = [
  "How is my savings rate?",
  "I want to buy a new phone — can I afford it?",
  "Which categories am I overspending in?",
  "Give me your top tips to improve my finances",
  "What are my key insights this month?",
  "How much do I spend on food?",
  "What is my net balance?",
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
