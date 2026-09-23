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

// ── Advisor Reply Engine ───────────────────────────────────────────────────
function buildAdvisorReply(question: string, d: DashboardInsights): string {

  const q   = question.toLowerCase().trim();
  const rate = d.monthly_income > 0 ? (d.savings / d.monthly_income) * 100 : 0;
  const savingsRate    = rate.toFixed(1);
  const overspending   = d.budget_status.filter(b => b.status === "overspending");
  const onTrack        = d.budget_status.filter(b => b.status === "on_track");
  const under          = d.budget_status.filter(b => b.status === "under");
  const disposable     = Math.max(d.monthly_income - d.monthly_expenses, 0);
  const totalOverspend = overspending.reduce((s, o) => s + o.actual_amount - o.recommended_amount, 0);

  const has = (...words: string[]) => words.some(w => q.includes(w));

  const extractAmount = (): number | null => {
    const m = question.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i);
    return m ? parseInt(m[1].replace(/,/g, "")) : null;
  };

  const extractItem = (): string => {
    const items = ["phone","iphone","android","samsung","oneplus","pixel","laptop","macbook","dell","hp","lenovo","asus","bike","motorcycle","scooter","car","suv","sedan","tv","television","monitor","camera","watch","smartwatch","airpods","headphone","tablet","ipad","trip","vacation","holiday","flight","furniture","sofa","bed","ac","air conditioner","washing machine","refrigerator","fridge","gadget","clothes","dress","shoes","bag","jewellery","gold","course","certification","gym","membership"];
    return items.find(i => q.includes(i)) ?? "this item";
  };

  // ════════════════════════════════════════════════════════════
  // 1. GREETINGS
  // ════════════════════════════════════════════════════════════
  if (has("hi","hello","hey","hii","hiii","helo","heya","heyy","namaste","namaskar","good morning","good afternoon","good evening","good night","gm","ge","sup","yo","whats up","what's up","wassup","howdy","hola")) {
    return `Hi there! 👋 I'm your AI Financial Advisor with full context of your finances.\n\n📊 Current snapshot:\n• Income: ${fmt.format(d.monthly_income)}/mo\n• Expenses: ${fmt.format(d.monthly_expenses)}/mo\n• Savings: ${fmt.format(d.savings)}/mo (${savingsRate}%)\n• Balance: ${fmt.format(d.total_balance)}\n${overspending.length > 0 ? `\n⚠️ Overspending in: ${overspending.map(o => o.category).join(", ")}` : "\n✅ All budget categories are healthy!"}\n\nAsk me anything — savings, budget, purchases, investments, debt, or financial planning!`;
  }

  // ════════════════════════════════════════════════════════════
  // 2. THANKS / GOODBYE
  // ════════════════════════════════════════════════════════════
  if (has("thank","thanks","ty","thx","thnks","tq","ok thanks","okay thanks","cheers","appreciate","great thanks")) {
    return `You're welcome! 😊 Your savings rate is ${savingsRate}% right now. ${rate < 20 ? `You're ${(20 - rate).toFixed(1)}% away from the recommended 20% — keep pushing! 💪` : "You're above the 20% target — excellent discipline! 🎉"}`;
  }

  if (has("bye","goodbye","see you","see ya","later","cya","take care","good night","good bye","gtg")) {
    return `Goodbye! 👋 Remember: your savings rate is ${savingsRate}%. ${rate >= 20 ? "You're doing great — keep it up!" : "Try to inch it toward 20%. Every rupee saved counts!"} Come back anytime!`;
  }

  // ════════════════════════════════════════════════════════════
  // 3. SELF-AWARENESS / CAPABILITIES / TESTING
  // ════════════════════════════════════════════════════════════
  if (has("what can you do","what do you do","capabilities","how do you work","what are you","who are you","tell me about yourself","introduce yourself","are you ai","are you a bot","are you smart","how good are you","test","testing","demo","can you help","what can i ask","what topics")) {
    return `I'm your personalised AI Financial Advisor! 🤖\n\nI'm powered by YOUR real transaction data — not generic advice.\n\nTopics I can help with:\n1. 💰 Savings rate & income analysis\n2. 📊 Budget breakdown by category\n3. 🛒 "Can I afford X?" — instant check\n4. 🎯 Goal planning & feasibility\n5. 🔁 Recurring subscription drift\n6. 💡 Personalised money-saving tips\n7. 📈 Investment & SIP guidance\n8. 🆘 Emergency fund planning\n9. 💳 Debt / EMI management\n10. 🧾 Tax saving tips (India)\n11. 📉 Inflation impact analysis\n12. 🔮 What-if financial scenarios\n\nTry asking me anything natural — I understand context!`;
  }

  // ════════════════════════════════════════════════════════════
  // 4. COMPLIMENTS / REACTIONS
  // ════════════════════════════════════════════════════════════
  if (has("wow","amazing","impressive","good job","well done","nice work","excellent","brilliant","fantastic","superb","love it","love this","awesome","wonderful","great","cool","perfect","useful","helpful","smart")) {
    return `Thank you! 😄 I'm built entirely on your real transaction data, so every answer is personalised.\n\nQuick check-in — your finances:\n• Savings rate: ${savingsRate}% ${rate >= 20 ? "✅" : "⚠️"}\n• Over-budget categories: ${overspending.length}\n• Disposable income: ${fmt.format(disposable)}/mo\n\nAnything specific to explore?`;
  }

  // ════════════════════════════════════════════════════════════
  // 5. PURCHASE / AFFORDABILITY — VERY BROAD DETECTION
  // ════════════════════════════════════════════════════════════
  if (has(
    "want to buy","wanna buy","should i buy","i want to buy","planning to buy","thinking of buying","thinking about buying",
    "considering buying","looking to buy","want to get","should i get","want to purchase","can i buy","can i afford",
    "afford","purchase","is it worth","worth buying","worth getting","should i spend","can i spend",
    "buy a","get a","spend on","looking for a","order a",
    // items directly
    "phone","iphone","android","samsung","oneplus","pixel","laptop","macbook","dell","hp","lenovo","asus",
    "bike","motorcycle","scooter","car","suv","sedan","tv","television","monitor","camera","watch","smartwatch",
    "airpods","headphone","tablet","ipad","trip","vacation","holiday","flight","furniture","sofa","bed",
    "ac","air conditioner","washing machine","refrigerator","fridge","gadget","shoes","bag","jewellery"
  )) {
    const amount = extractAmount();
    const item   = extractItem();
    if (amount && amount > 0) {
      const months  = disposable > 0 ? Math.ceil(amount / disposable) : Infinity;
      const pct     = disposable > 0 ? ((amount / disposable) * 100).toFixed(0) : "N/A";
      const verdict = amount <= disposable ? "✅ Affordable right now"
                    : amount <= disposable * 3 ? "⚠️ Manageable — save for a couple months"
                    : "❌ Would need significant saving up";
      return `${verdict} — ${item} for ${fmt.format(amount)}\n\n📊 Affordability breakdown:\n• Your monthly disposable: ${fmt.format(disposable)}\n• Purchase = ${pct}% of monthly disposable\n• Months to save up: ~${isFinite(months) ? months : "∞"}\n• Balance after buying: ${fmt.format(disposable - amount)}\n\n${amount <= disposable ? "✅ It fits in one month's disposable income. Go for it — but protect your goal commitments." : `Consider saving up: set a goal on the Goals page and track progress.\n💡 Use the Affordability Checker page for a full analysis with safety buffer.`}`;
    }
    return `Great question about ${item}!\n\n📋 Your affordability profile:\n• Monthly disposable income: ${fmt.format(disposable)}\n• Savings rate: ${savingsRate}%\n• Current balance: ${fmt.format(d.total_balance)}\n\n💡 Rule of thumb:\n• Comfortable: purchase < 30% of monthly disposable (${fmt.format(disposable * 0.3)})\n• Manageable: purchase = 1-3 months of savings\n• Needs planning: purchase > 3 months of savings\n\n👉 Enter the exact price in the **Affordability Checker** page for a precise analysis including your safety buffer & goal commitments.`;
  }

  // ════════════════════════════════════════════════════════════
  // 6. SAVINGS
  // ════════════════════════════════════════════════════════════
  if (has("sav","piggy","how much do i save","how much am i saving","am i saving","saving enough","savings rate","save more","how to save","saving habit","should i save","saving money","save money","not saving","cant save","can't save")) {
    if (rate >= 20) return `🎉 Excellent savings discipline!\n\n• Savings rate: ${savingsRate}% (${fmt.format(d.savings)}/mo)\n• Beating the 20% recommendation ✅\n\nNext steps:\n1. Channel surplus into a SIP / index fund (beat 6% inflation)\n2. Accelerate your goals on the Goals page\n3. Build emergency fund to ${fmt.format(d.monthly_expenses * 6)} (6 months)\n4. Consider NPS for tax-efficient retirement savings`;
    if (rate >= 10) return `📈 Savings rate: ${savingsRate}% (${fmt.format(d.savings)}/mo) — decent, room to grow.\n\nTo hit 20%:\n• Need ${fmt.format(d.monthly_income * 0.2 - d.savings)} more/mo\n• Cut: ${overspending.length > 0 ? overspending.slice(0,2).map(o=>o.category).join(" and ") : "discretionary spend"}\n• Automate savings on payday (pay yourself first)\n\n💡 ₹1,000 extra/mo at 12% CAGR = ₹${Math.round(1000 * ((Math.pow(1.01, 120) - 1) / 0.01)).toLocaleString("en-IN")} in 10 years!`;
    return `⚠️ Savings rate: ${savingsRate}% (${fmt.format(d.savings)}/mo) — below 20%.\n\nAction plan:\n1. 🎯 Target: ${fmt.format(d.monthly_income * 0.2)}/mo\n2. 📉 Gap: ${fmt.format(d.monthly_income * 0.2 - d.savings)}/mo to close\n3. 🔴 Biggest leak: ${overspending.length > 0 ? `${overspending[0].category} (${fmt.format(overspending[0].actual_amount - overspending[0].recommended_amount)} over)` : "No single major overspend"}\n4. 💡 Automate a standing instruction on salary day\n\nFix overspend → save ${fmt.format(totalOverspend)} more/mo immediately!`;
  }

  // ════════════════════════════════════════════════════════════
  // 7. INVESTMENT & SIP
  // ════════════════════════════════════════════════════════════
  if (has("invest","sip","mutual fund","stock","share","equity","nifty","sensex","index fund","etf","fd","fixed deposit","ppf","elss","nps","gold","crypto","bitcoin","portfolio","returns","cagr","compound","wealth creation","long term","where to put money","where should i invest","where do i invest","how to invest","start investing","begin investing","lumpsum","lump sum")) {
    const surplus = d.savings;
    const sip5    = Math.round(surplus * ((Math.pow(1.01, 60) - 1) / 0.01));
    const sip10   = Math.round(surplus * ((Math.pow(1.01, 120) - 1) / 0.01));
    const sip15   = Math.round(surplus * ((Math.pow(1.01, 180) - 1) / 0.01));
    return `📈 Investment Roadmap (based on your ₹${surplus.toLocaleString("en-IN")}/mo surplus):\n\nProjection at 12% CAGR:\n• 5 years:  ${fmt.format(sip5)}\n• 10 years: ${fmt.format(sip10)}\n• 15 years: ${fmt.format(sip15)}\n\nRecommended priority order (India):\n1. Emergency fund first → ${fmt.format(d.monthly_expenses * 6)}\n2. EPF/PPF → risk-free, tax-saving under 80C\n3. ELSS SIP → tax saving + equity growth (~12-15% CAGR)\n4. Index Nifty 50 SIP → low-cost, diversified\n5. FD for short-term (<3 years) goals\n6. Direct equity only after above\n\n⚠️ These are general guidelines. Consult a SEBI-registered advisor for personalised advice.`;
  }

  // ════════════════════════════════════════════════════════════
  // 8. EMERGENCY FUND
  // ════════════════════════════════════════════════════════════
  if (has("emergency","emergency fund","rainy day","safety net","contingency","backup money","3 month","6 month","job loss","lose job","sudden expense","unexpected","buffer fund")) {
    const t3 = d.monthly_expenses * 3;
    const t6 = d.monthly_expenses * 6;
    const months = disposable > 0 ? Math.ceil(t6 / disposable) : Infinity;
    return `🆘 Emergency Fund:\n\n• 3-month target: ${fmt.format(t3)}\n• 6-month target (ideal): ${fmt.format(t6)}\n• Your balance: ${fmt.format(d.total_balance)}\n• Status: ${d.total_balance >= t6 ? "✅ Fully funded!" : d.total_balance >= t3 ? "⚠️ Minimum met — build to 6 months" : "❌ Insufficient — priority action needed"}\n\n${d.total_balance < t6 ? `To fully fund: ~${isFinite(months) ? months : "∞"} months at your current savings rate.\n\nWhere to keep it: Liquid mutual fund or high-interest savings account — NOT equities.` : "Great! Emergency fund is solid. Now focus on goal savings and investments."}`;
  }

  // ════════════════════════════════════════════════════════════
  // 9. DEBT, EMI, LOAN
  // ════════════════════════════════════════════════════════════
  if (has("debt","emi","loan","credit card","credit","borrow","borrowing","repay","repayment","mortgage","home loan","personal loan","car loan","interest","outstanding","dues","owing","liability","installment","instalment","equated","pay off","payoff","debt free")) {
    const emiItem = d.budget_status.find(b => b.category === "EMI");
    const emiAmt  = emiItem?.actual_amount ?? 0;
    const emiPct  = d.monthly_income > 0 ? ((emiAmt / d.monthly_income) * 100).toFixed(1) : "0";
    return `💳 Debt & EMI Analysis:\n\n• Your EMI spend: ${fmt.format(emiAmt)}/mo (${emiPct}% of income)\n• Safe limit: 40% of income = ${fmt.format(d.monthly_income * 0.4)}/mo\n• Status: ${emiAmt <= d.monthly_income * 0.4 ? "✅ Within safe limits" : "⚠️ High — may stress your cash flow"}\n\nDebt payoff strategy:\n1. High-interest first (credit cards > 36% p.a.)\n2. Then personal loans, then home loan\n3. Extra EMI when you have surplus\n\n• Monthly surplus available for prepayment: ${fmt.format(disposable)}\n\n💡 One extra EMI/year on a 20-year home loan saves 3-4 years of payments!`;
  }

  // ════════════════════════════════════════════════════════════
  // 10. RETIREMENT / LONG-TERM
  // ════════════════════════════════════════════════════════════
  if (has("retire","retirement","pension","old age","long term","financial independence","fire","financially free","future plan","financial freedom","when can i retire","corpus")) {
    const corpus = d.monthly_expenses * 12 * 25;
    const grow30 = Math.round(d.savings * ((Math.pow(1.01, 360) - 1) / 0.01));
    return `🏖️ Retirement Planning:\n\n• Corpus needed (25× annual expenses): ${fmt.format(corpus)}\n• Your savings: ${fmt.format(d.savings)}/mo\n• At 12% CAGR over 30 years: ${fmt.format(grow30)}\n\nRecommended allocation:\n1. NPS — tax-efficient, builds pension\n2. ELSS / Index funds — inflation-beating\n3. EPF — employer-matched\n\n💡 Rule: Earmark 15% of income for retirement.\nYou save ${savingsRate}% total — aim to allocate half for long-term retirement corpus.`;
  }

  // ════════════════════════════════════════════════════════════
  // 11. TAX
  // ════════════════════════════════════════════════════════════
  if (has("tax","tds","itr","income tax","tax sav","80c","section 80","deduction","tax return","tax filing","tax liability","80d","hra","new regime","old regime","tax planning","taxable","exemption","rebate")) {
    const annual = d.monthly_income * 12;
    return `🧾 Tax Planning (India):\n\nYour annual income (est.): ${fmt.format(annual)}\n\nKey deductions — Old Regime:\n• 80C: Up to ₹1.5L (ELSS, PPF, EPF, LIC, home loan principal)\n• 80D: Up to ₹25K (health insurance)\n• HRA: Based on rent paid — ${fmt.format(d.budget_status.find(b=>b.category==="Rent")?.actual_amount ?? 0)}/mo rent qualifies\n• 80CCD(1B): Extra ₹50K via NPS\n• Standard deduction: ₹50,000\n\nNew vs Old regime:\n• New: Lower rates, fewer deductions — simpler\n• Old: Better if investments+HRA > ₹3.75L/yr\n\n💡 If your 80C investments fill the ₹1.5L limit and you pay rent — stick with old regime.`;
  }

  // ════════════════════════════════════════════════════════════
  // 12. INFLATION
  // ════════════════════════════════════════════════════════════
  if (has("inflation","price rise","prices going up","cost of living","purchasing power","real return","value of money","buying power","cost increase","things getting expensive","everything is expensive")) {
    const in5  = Math.round(d.monthly_expenses * Math.pow(1.06, 5));
    const in10 = Math.round(d.monthly_expenses * Math.pow(1.06, 10));
    return `📉 Inflation Impact:\n\nAt 6% annual inflation:\n• Current expenses: ${fmt.format(d.monthly_expenses)}/mo\n• In 5 years: ${fmt.format(in5)}/mo\n• In 10 years: ${fmt.format(in10)}/mo\n\nYour savings must outgrow 6% to maintain purchasing power.\n\nCurrent savings rate: ${savingsRate}%\n\nInvest where returns > 6%:\n• Index funds: ~12-15% historically\n• FD: ~6-7% (barely beats inflation)\n• Savings account: ~3-4% (loses value!)\n\n💡 ${fmt.format(d.savings)}/mo idle in savings account loses ₹${Math.round(d.savings * 0.06 * 10).toLocaleString("en-IN")} in real value over 10 years!`;
  }

  // ════════════════════════════════════════════════════════════
  // 13. BUDGET & OVERSPENDING
  // ════════════════════════════════════════════════════════════
  if (has("budget","oversp","over budget","categories","where is my money","where am i spending","money going","money go","how much in each","breakdown","under budget","on track","budget analysis","budget report","budget status","spending habits","spending pattern","track spend")) {
    if (d.budget_status.length === 0) return "No budget generated yet. Go to Budget page → 'Recompute Budget' to generate category-level recommendations from your transaction history.";
    const catLines = d.budget_status
      .sort((a, b) => (b.actual_amount - b.recommended_amount) - (a.actual_amount - a.recommended_amount))
      .map(o => {
        const diff = o.actual_amount - o.recommended_amount;
        const icon = diff > 0 ? "🔴" : diff < 0 ? "🟢" : "🟡";
        return `${icon} ${o.category}: ${fmt.format(o.actual_amount)} / ${fmt.format(o.recommended_amount)}`;
      }).join("\n");
    return `📊 Budget breakdown (spent / recommended):\n${catLines}\n\n${overspending.length > 0 ? `Total overspend: ${fmt.format(totalOverspend)}/mo\nFix this → your savings rate would jump to ${((d.savings + totalOverspend) / d.monthly_income * 100).toFixed(1)}%!` : "✅ Every category is within budget — great discipline!"}`;
  }

  // ════════════════════════════════════════════════════════════
  // 14. SPECIFIC CATEGORY QUERIES
  // ════════════════════════════════════════════════════════════
  const categoryMap: Record<string, string[]> = {
    Food:          ["food","eating","restaurant","zomato","swiggy","blinkit","grocery","groceries","lunch","dinner","breakfast","snack","meal","coffee","chai","tea","canteen","cafe","outside food","dining","dine","fast food","ordering food","food delivery"],
    Shopping:      ["shopping","amazon","flipkart","myntra","meesho","apparel","retail","online shopping","mall"],
    Transport:     ["transport","uber","ola","rapido","fuel","petrol","diesel","commute","cab","auto","bus","metro","toll","parking","ride","travelling to","getting to work"],
    Subscription:  ["subscription","netflix","spotify","hotstar","prime video","amazon prime","youtube premium","disney","ott","streaming","monthly plan","annual plan","software subscription","saas","app subscription"],
    Utilities:     ["utilities","electricity","water","internet","broadband","wifi","gas","lpg","cylinder","phone bill","mobile bill","dth","cable","utility","bill pay","recharge"],
    Rent:          ["rent","house rent","apartment","flat","pg","paying guest","landlord","accommodation","hostel"],
    EMI:           ["emi","loan emi","monthly installment","equated","home loan emi","car loan emi","personal loan emi"],
    Healthcare:    ["health","medical","doctor","medicine","hospital","pharmacy","chemist","clinic","diagnostic","health insurance","lab test","consultation","healthcare","pharma"],
    Entertainment: ["entertainment","movie","cinema","pvr","inox","concert","show","gaming","game","pub","bar","club","outing","recreation","fun activities"],
    Education:     ["education","course","class","coaching","learning","book","school","college","fees","tuition","udemy","coursera","edtech","online course","certification","skill"],
  };
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (has(...keywords)) {
      const bItem = d.budget_status.find(b => b.category === cat);
      if (bItem) {
        const diff    = bItem.actual_amount - bItem.recommended_amount;
        const status  = diff > 0 ? `⚠️ ${fmt.format(diff)} over budget` : `✅ ${fmt.format(Math.abs(diff))} under budget`;
        const pctInc  = d.monthly_income > 0 ? ((bItem.actual_amount / d.monthly_income) * 100).toFixed(1) : "N/A";
        return `${cat} spending analysis:\n• Spent this month: ${fmt.format(bItem.actual_amount)} (${pctInc}% of income)\n• Recommended budget: ${fmt.format(bItem.recommended_amount)}\n• Status: ${status}\n\n${diff > 0 ? `💡 Cutting to budget saves ${fmt.format(diff)}/mo = ${fmt.format(diff * 12)}/yr — enough to fund a goal!` : `You're managing ${cat} well — consider redirecting any surplus here to investments.`}`;
      }
      return `No specific ${cat} budget data yet. Visit Budget page → 'Recompute Budget'.`;
    }
  }

  // ════════════════════════════════════════════════════════════
  // 15. INCOME & SALARY
  // ════════════════════════════════════════════════════════════
  if (has("income","earn","salary","ctc","take home","pay","stipend","wages","how much do i make","what do i earn","my income","my salary","how much i earn","monthly income","annual income","yearly income")) {
    return `💰 Income overview:\n• Monthly income: ${fmt.format(d.monthly_income)}\n• Annual estimate: ${fmt.format(d.monthly_income * 12)}\n• Monthly expenses: ${fmt.format(d.monthly_expenses)} (${d.monthly_income > 0 ? ((d.monthly_expenses / d.monthly_income) * 100).toFixed(1) : "N/A"}% of income)\n• Disposable income: ${fmt.format(disposable)}/mo\n• Savings rate: ${savingsRate}%\n\n${rate < 50 ? `You're spending ${(100 - rate).toFixed(1)}% of income. Financial rule: keep expenses under 70-75% for healthy savings.` : "Strong income management!"}`;
  }

  // ════════════════════════════════════════════════════════════
  // 16. EXPENSES
  // ════════════════════════════════════════════════════════════
  if (has("expense","my expenses","total expense","how much i spend","what i spend","my spend","outflow","monthly cost","cost per month","how much per month","spending too much","overspend")) {
    return `📊 Expense analysis:\n• Total monthly: ${fmt.format(d.monthly_expenses)} (${d.monthly_income > 0 ? ((d.monthly_expenses / d.monthly_income) * 100).toFixed(1) : "N/A"}% of income)\n• Categories tracked: ${d.budget_status.length}\n• Over budget: ${overspending.length} | On track: ${onTrack.length} | Under: ${under.length}\n\n${overspending.length > 0 ? `Top overspend: ${overspending[0].category} — ${fmt.format(overspending[0].actual_amount - overspending[0].recommended_amount)} over\n\nBringing all to budget saves ${fmt.format(totalOverspend)}/mo.` : "✅ All categories are within budget — impressive!"}`;
  }

  // ════════════════════════════════════════════════════════════
  // 17. GOALS
  // ════════════════════════════════════════════════════════════
  if (has("goal","financial goal","holiday fund","want to achieve","planning for","milestone","aspiration","save for","future","down payment","house goal","travel goal","target amount","goal planning")) {
    return `🎯 Goal Planning:\n\nYour disposable income: ${fmt.format(disposable)}/mo — this is what you can commit to goals.\n\nFeasibility rules:\n• ✅ Feasible: monthly target ≤ disposable income\n• ⚠️ Tight: monthly target > 80% of disposable\n• ❌ Not Feasible: monthly target > disposable\n\nOn the Goals page you can:\n1. Create a goal (name, amount, deadline)\n2. See AI-computed monthly savings needed\n3. Contribute and track progress\n\n💡 Popular goals: Emergency Fund (${fmt.format(d.monthly_expenses * 6)}), Vacation, Laptop, Home Down Payment`;
  }

  // ════════════════════════════════════════════════════════════
  // 18. BALANCE / NET WORTH
  // ════════════════════════════════════════════════════════════
  if (has("balance","net worth","wealth","total money","how much money","how much do i have","how much have i saved","my total","overall","net position","what is my balance","current balance")) {
    return `🏦 Net financial position:\n• Balance: ${fmt.format(d.total_balance)}\n  (All income recorded − all expenses recorded)\n• Monthly savings: ${fmt.format(d.savings)}\n• Savings rate: ${savingsRate}%\n• Annual growth at this rate: ${fmt.format(d.savings * 12)}\n\n${d.total_balance > 0 ? `✅ Positive balance — you're building wealth!\nAt 12% CAGR, ${fmt.format(d.total_balance)} becomes ${fmt.format(Math.round(d.total_balance * Math.pow(1.12, 10)))} in 10 years.` : "⚠️ Negative balance — expenses exceeded income in recorded history. Focus on reducing overspend."}`;
  }

  // ════════════════════════════════════════════════════════════
  // 19. ADVICE / TIPS / IMPROVE
  // ════════════════════════════════════════════════════════════
  if (has("advi","tip","suggest","help me","what should","how can i","how do i","improve","better my","fix my","financial health","money management","personal finance","manage money","manage finance","guide me","guide","counsel","recommendation","best practice","what to do","what should i do","action")) {
    const tips: string[] = [];
    if (rate < 20) tips.push(`Boost savings rate: ${savingsRate}% → 20% (need ${fmt.format(d.monthly_income * 0.2 - d.savings)} more/mo)`);
    if (overspending.length > 0) tips.push(`Cut ${overspending[0].category} by ${fmt.format(overspending[0].actual_amount - overspending[0].recommended_amount)} to match budget`);
    if (d.total_balance < d.monthly_expenses * 3) tips.push(`Build emergency fund: need ${fmt.format(d.monthly_expenses * 3 - d.total_balance)} more`);
    tips.push("Run Recurring Costs → Drift Analysis to catch silent subscription price creep");
    tips.push("Use Affordability Checker before any large purchase");
    tips.push("Automate savings on payday — pay yourself first");
    tips.push("Review goals & check feasibility on the Goals page");
    if (rate >= 20) tips.push(`Start a SIP — your surplus of ${fmt.format(d.savings)}/mo can grow substantially`);
    return `💡 Your personalised financial action plan:\n\n${tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n${overspending.length > 0 ? `\n🎯 Quick win: Fix overspend → free up ${fmt.format(totalOverspend)}/mo = ${fmt.format(totalOverspend * 12)}/yr!` : "\n✅ You're in solid shape — keep the discipline!"}`;
  }

  // ════════════════════════════════════════════════════════════
  // 20. INSIGHTS / MONTHLY SUMMARY
  // ════════════════════════════════════════════════════════════
  if (has("insight","summary","overview","report","monthly","month","how am i doing","am i doing well","financial status","status","review","analyse","analyze","analysis","financial check","check in","checkup","health check","financial report","my finances")) {
    const insightText = d.insights.length > 0
      ? d.insights.map((ins, i) => `${i + 1}. ${ins}`).join("\n")
      : "No specific alerts — finances look stable!";
    const healthLabel = rate >= 20 ? "🟢 Healthy" : rate >= 10 ? "🟡 Moderate" : "🔴 Needs Attention";
    return `📋 Financial Health Report — ${healthLabel}\n\n• Income: ${fmt.format(d.monthly_income)}/mo\n• Expenses: ${fmt.format(d.monthly_expenses)}/mo\n• Savings: ${fmt.format(d.savings)}/mo (${savingsRate}%)\n• Cumulative balance: ${fmt.format(d.total_balance)}\n• Budget: ${overspending.length} over, ${onTrack.length} on track, ${under.length} under\n\n🔍 Auto-insights:\n${insightText}`;
  }

  // ════════════════════════════════════════════════════════════
  // 21. RECURRING / SUBSCRIPTIONS / DRIFT
  // ════════════════════════════════════════════════════════════
  if (has("subscri","recurr","drift","detect","price creep","hidden cost","monthly charge","silent","auto renew","cancel","unsubscribe","ott","streaming services","how much on subscription","wasted money","unnecessary")) {
    const subItem = d.budget_status.find(b => b.category === "Subscription");
    return `🔁 Recurring & Subscription Tracker:\n\n${subItem ? `Your subscription spend: ${fmt.format(subItem.actual_amount)}/mo\nBudget: ${fmt.format(subItem.recommended_amount)}\n${subItem.actual_amount > subItem.recommended_amount ? "⚠️ Over budget — review & cancel unused ones!" : "✅ Subscription spend is within budget."}\n` : ""}\nThe Recurring Costs page uses:\n• Gap-consistency filter (CoV < 0.50)\n• Drift score = price magnitude + consistency + monotonic trend\n\nHow to use:\n1. Recurring Costs → 'Run Drift Analysis'\n2. High severity cards = prices quietly creeping up\n3. Cancel or renegotiate those subscriptions`;
  }

  // ════════════════════════════════════════════════════════════
  // 22. WHAT-IF SCENARIOS
  // ════════════════════════════════════════════════════════════
  if (has("what if","what would happen","if i","suppose","scenario","hypothetical","imagine","let's say","lets say","simulate","projection","if i spend","if i save","if i earn","if i cut","if i reduce","if i increase")) {
    const amount = extractAmount();
    if (amount && amount > 0) {
      const newExp     = d.monthly_expenses + amount;
      const newSav     = d.monthly_income - newExp;
      const newRate    = d.monthly_income > 0 ? ((newSav / d.monthly_income) * 100).toFixed(1) : "0";
      const savNewExp  = d.monthly_expenses - amount;
      const savNewSav  = d.monthly_income - savNewExp;
      const savNewRate = d.monthly_income > 0 ? ((savNewSav / d.monthly_income) * 100).toFixed(1) : "0";
      return `🔮 Scenario Simulation for ${fmt.format(amount)}:\n\nIf you spend ${fmt.format(amount)} MORE/mo:\n• Expenses: ${fmt.format(newExp)} | Savings: ${fmt.format(newSav)} (${newRate}%)\n• ${parseFloat(newRate) < 0 ? "❌ Deficit! Not recommended." : parseFloat(newRate) < 10 ? "⚠️ Savings drop dangerously low." : "✅ Manageable."}\n\nIf you cut ${fmt.format(amount)} from expenses:\n• Expenses: ${fmt.format(savNewExp)} | Savings: ${fmt.format(savNewSav)} (${savNewRate}%)\n• ${parseFloat(savNewRate) >= 20 ? "🎉 You'd hit the 20% savings target!" : "📈 An improvement from current " + savingsRate + "%"}`;
    }
    return `🔮 I can run scenario simulations! Tell me an amount:\n• "What if I spend ₹5,000 more on food?"\n• "What if I cut transport by ₹2,000?"\n• "What if I save ₹3,000 more per month?"\n\nCurrent baseline: income ${fmt.format(d.monthly_income)}, expenses ${fmt.format(d.monthly_expenses)}, savings ${savingsRate}%`;
  }

  // ════════════════════════════════════════════════════════════
  // 23. IDENTITY / PROFESSIONAL CONTEXT
  // ════════════════════════════════════════════════════════════
  if (has("i am a","i'm a","i am student","i'm a student","i am fresher","salaried","freelancer","self employed","business owner","doctor","engineer","teacher","professor","working professional","new job","first job","fresher","entry level")) {
    return `Great context! Based on your financial data:\n• Monthly income: ${fmt.format(d.monthly_income)}\n• Savings rate: ${savingsRate}%\n• Emergency fund status: ${d.total_balance >= d.monthly_expenses * 3 ? "✅ Adequate" : "⚠️ Build this first"}\n\nPersonalised advice:\n• ${rate < 10 ? "Priority: build the savings habit — even ₹1,000/mo invested consistently compounds powerfully" : rate < 20 ? "Good start — now aim for 20%. Trim the overspent categories" : "Excellent! Time to invest that surplus — SIP in an index fund is a great start"}\n• Your emergency fund target: ${fmt.format(d.monthly_expenses * 6)}\n• Start investing early — compound interest rewards time most`;
  }

  // ════════════════════════════════════════════════════════════
  // FINAL FALLBACK — contextual, never repeats
  // ════════════════════════════════════════════════════════════
  const healthEmoji = rate >= 20 ? "🟢" : rate >= 10 ? "🟡" : "🔴";
  const topTip = overspending.length > 0
    ? `Top opportunity: reduce ${overspending[0].category} by ${fmt.format(overspending[0].actual_amount - overspending[0].recommended_amount)}/mo`
    : `Savings rate ${savingsRate}% is solid — consider investing the surplus`;
  return `${healthEmoji} Here's your financial snapshot:\n• Income: ${fmt.format(d.monthly_income)}/mo | Expenses: ${fmt.format(d.monthly_expenses)}/mo\n• Savings: ${fmt.format(d.savings)}/mo (${savingsRate}%) | Balance: ${fmt.format(d.total_balance)}\n\n💡 ${topTip}\n\nTry asking:\n→ "I want to buy a ₹40,000 laptop" — affordability check\n→ "How can I improve my savings?" — personalised tips\n→ "Budget breakdown" — all categories\n→ "Where should I invest?" — investment guide\n→ "What if I spend ₹5,000 more?" — scenario sim\n→ "What is my financial health?" — full report`;
}

const SUGGESTED_QUESTIONS = [
  "How is my savings rate?",
  "I want to buy a new phone — can I afford it?",
  "Budget breakdown — all categories",
  "Give me your top tips to improve my finances",
  "What are my key insights this month?",
  "Where should I invest my savings?",
  "What is my emergency fund status?",
  "What if I spend ₹5,000 more per month?",
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
        const rate = res.data.monthly_income > 0
          ? ((res.data.savings / res.data.monthly_income) * 100).toFixed(1) : "0";
        setMessages([{
          role: "advisor",
          text: `Hello! 👋 I'm your AI Financial Advisor — I have full context of your real transaction data.\n\n📊 Your current position:\n• Income: ${fmt.format(res.data.monthly_income)}/mo\n• Expenses: ${fmt.format(res.data.monthly_expenses)}/mo\n• Savings: ${fmt.format(res.data.savings)}/mo (${rate}%)\n• Balance: ${fmt.format(res.data.total_balance)}${res.data.insights.length > 0 ? `\n\n💡 Insight: ${res.data.insights[0]}` : ""}\n\nAsk me anything — savings, budget, purchases, investments, debt, or financial planning!`,
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
    await new Promise(r => setTimeout(r, 600 + Math.random() * 600));
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
            { icon: TrendingUp, label: "Income",   value: fmt.format(dashData.monthly_income),   cls: "text-emerald-700" },
            { icon: BarChart2,  label: "Expenses", value: fmt.format(dashData.monthly_expenses), cls: "text-slate-900"   },
            { icon: PiggyBank,  label: "Savings",  value: fmt.format(dashData.savings),          cls: dashData.savings >= 0 ? "text-emerald-700" : "text-rose-700" },
            { icon: Target,     label: "Balance",  value: fmt.format(dashData.total_balance),    cls: dashData.total_balance >= 0 ? "text-slate-900" : "text-rose-700" },
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
              placeholder="Ask anything — savings, budget, investments, purchases, what-if scenarios…"
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
            Advice derived from your transaction data. Not a substitute for professional financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
