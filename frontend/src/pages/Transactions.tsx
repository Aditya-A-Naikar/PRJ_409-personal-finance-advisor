import { useEffect, useRef, useState } from "react";
import {
  Search, PlusCircle, Upload, Download, X, ChevronDown,
  ArrowUpCircle, ArrowDownCircle, Tag, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import api from "../services/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface Transaction {
  id: number;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  transaction_type: "income" | "expense";
  category: string;
  confidence: number;
  classification_method: string;
  source: string;
  is_recurring: boolean;
}

interface UploadSummary {
  total_rows: number;
  imported: number;
  failed: number;
  errors: { row_number: number; reason: string }[];
}

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  "All", "Food", "Rent", "EMI", "Transport", "Salary/Income",
  "Shopping", "Utilities", "Healthcare", "Subscription", "Entertainment",
  "Education", "Other",
];

const METHOD_BADGE: Record<string, string> = {
  ml: "bg-violet-100 text-violet-700",
  rule: "bg-blue-100 text-blue-700",
  "demo-seed": "bg-slate-100 text-slate-500",
};

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

// ── Sub-components ─────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-blue-600" />
        <p className="text-sm text-slate-400">Loading transactions…</p>
      </div>
    </div>
  );
}

function CategoryPill({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    Food: "bg-orange-100 text-orange-700",
    Rent: "bg-blue-100 text-blue-700",
    EMI: "bg-sky-100 text-sky-700",
    Transport: "bg-teal-100 text-teal-700",
    "Salary/Income": "bg-emerald-100 text-emerald-700",
    Shopping: "bg-pink-100 text-pink-700",
    Utilities: "bg-cyan-100 text-cyan-700",
    Healthcare: "bg-red-100 text-red-700",
    Subscription: "bg-purple-100 text-purple-700",
    Entertainment: "bg-violet-100 text-violet-700",
    Education: "bg-amber-100 text-amber-700",
    Other: "bg-slate-100 text-slate-500",
  };
  const cls = colors[cat] ?? "bg-slate-100 text-slate-500";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      <Tag size={10} />
      {cat}
    </span>
  );
}

// ── Add Transaction Modal ──────────────────────────────────────────────────
function AddModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    transaction_type: "expense",
    merchant: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ category: string; method: string; confidence: number } | null>(null);

  const up = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/transactions", {
        date: form.date,
        description: form.description,
        amount: parseFloat(form.amount),
        transaction_type: form.transaction_type,
        merchant: form.merchant || undefined,
      });
      setPreview({
        category: res.data.category,
        method: res.data.classification_method,
        confidence: res.data.confidence,
      });
      setTimeout(() => {
        onCreated();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Could not save transaction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold text-slate-900 mb-1">Add Transaction</h2>
        <p className="text-sm text-slate-500 mb-5">The ML classifier will auto-tag the category.</p>

        {preview ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
            <p className="font-semibold text-slate-800">Transaction saved!</p>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              Classified as <CategoryPill cat={preview.category} />
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${METHOD_BADGE[preview.method] ?? "bg-slate-100 text-slate-500"}`}>
                {preview.method} {(preview.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date" required value={form.date} onChange={up("date")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={form.transaction_type} onChange={up("transaction_type")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text" required placeholder="e.g. UPI/Netflix/subscription" value={form.description} onChange={up("description")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Amount (₹)</label>
                <input
                  type="number" required min="1" step="0.01" placeholder="0.00" value={form.amount} onChange={up("amount")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Merchant <span className="text-slate-400">(optional)</span></label>
                <input
                  type="text" placeholder="Auto-detected" value={form.merchant} onChange={up("merchant")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Classifying…</> : "Save Transaction"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── CSV Upload Modal ───────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadSummary | null>(null);
  const [error, setError] = useState("");

  const selectFile = (f: File | undefined) => {
    if (f && f.name.endsWith(".csv")) { setFile(f); setError(""); }
    else setError("Please select a valid .csv file.");
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/transactions/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      onUploaded();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = () => {
    window.open("http://127.0.0.1:8000/api/transactions/sample-csv", "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold text-slate-900 mb-1">Upload CSV</h2>
        <p className="text-sm text-slate-500 mb-5">
          Required columns: <code className="bg-slate-100 px-1 rounded text-xs">date, description, amount, type</code>
        </p>

        {result ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Rows", value: result.total_rows, cls: "bg-slate-50 text-slate-700" },
                { label: "Imported", value: result.imported, cls: "bg-emerald-50 text-emerald-700" },
                { label: "Failed", value: result.failed, cls: "bg-rose-50 text-rose-700" },
              ].map(({ label, value, cls }) => (
                <div key={label} className={`rounded-xl p-3 text-center ${cls}`}>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-1">
                {result.errors.map(e => (
                  <p key={e.row_number} className="text-xs text-rose-700">
                    Row {e.row_number}: {e.reason}
                  </p>
                ))}
              </div>
            )}

            <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                }`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); selectFile(e.dataTransfer.files[0]); }}
            >
              <Upload size={28} className={`mx-auto mb-3 ${dragging ? "text-blue-500" : "text-slate-400"}`} />
              {file ? (
                <p className="text-sm font-medium text-slate-800">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">Drop CSV here or click to browse</p>
                  <p className="text-xs text-slate-400 mt-1">Max 500 rows per upload</p>
                </>
              )}
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => selectFile(e.target.files?.[0])} />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={downloadSample}
                className="flex-1 flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                <Download size={14} /> Sample CSV
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : <><Upload size={14} /> Import</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Transactions Page ─────────────────────────────────────────────────
export default function Transactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const fetchTxns = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "200" };
      if (search) params.search = search;
      if (category !== "All") params.category = category;
      if (typeFilter !== "all") params.transaction_type = typeFilter;
      const res = await api.get("/transactions", { params });
      setTxns(res.data);
    } catch {
      setError("Could not load transactions. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTxns(); }, [search, category, typeFilter]);

  const totalIncome = txns.filter(t => t.transaction_type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txns.filter(t => t.transaction_type === "expense").reduce((s, t) => s + t.amount, 0);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-rose-600 font-medium">{error}</p>
          <button onClick={fetchTxns} className="mt-3 text-sm text-blue-600 hover:underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? "Loading…" : `${txns.length} transactions · ML-classified`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Upload size={15} /> Upload CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <PlusCircle size={15} /> Add Transaction
          </button>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Showing", value: txns.length, prefix: "", suffix: " transactions", cls: "text-slate-900" },
          { label: "Total Income", value: fmt.format(totalIncome), prefix: "", suffix: "", cls: "text-emerald-700" },
          { label: "Total Expenses", value: fmt.format(totalExpense), prefix: "", suffix: "", cls: "text-rose-700" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search merchant or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Type tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {(["all", "income", "expense"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${typeFilter === t
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Category dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCatDropdown(p => !p)}
            className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-xl text-sm text-slate-700 transition-colors min-w-[140px] justify-between"
          >
            <span className="truncate">{category === "All" ? "All Categories" : category}</span>
            <ChevronDown size={14} className={`transition-transform ${showCatDropdown ? "rotate-180" : ""}`} />
          </button>
          {showCatDropdown && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-48 max-h-60 overflow-y-auto">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); setShowCatDropdown(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${category === c ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {(search || category !== "All" || typeFilter !== "all") && (
          <button
            onClick={() => { setSearch(""); setCategory("All"); setTypeFilter("all"); }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <Spinner />
      ) : txns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-slate-600 font-medium">No transactions found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or adding a transaction.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Merchant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">ML Method</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {txns.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${t.transaction_type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}>
                          {t.merchant[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{t.merchant}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[180px]">{t.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CategoryPill cat={t.category} />
                      {t.is_recurring && (
                        <span className="ml-1.5 text-xs text-indigo-600 font-medium">↻</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${METHOD_BADGE[t.classification_method] ?? "bg-slate-100 text-slate-500"}`}>
                          {t.classification_method}
                        </span>
                        <span className="text-xs text-slate-400">{(t.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {t.transaction_type === "income" ? (
                          <ArrowUpCircle size={14} className="text-emerald-600 flex-shrink-0" />
                        ) : (
                          <ArrowDownCircle size={14} className="text-rose-500 flex-shrink-0" />
                        )}
                        <span className={`font-semibold tabular-nums ${t.transaction_type === "income" ? "text-emerald-700" : "text-slate-900"
                          }`}>
                          {fmt.format(t.amount)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 bg-slate-50">
            Showing {txns.length} result{txns.length !== 1 ? "s" : ""}. Categories auto-assigned by ML classifier.
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showAdd && <AddModal onClose={() => setShowAdd(false)} onCreated={fetchTxns} />}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={fetchTxns} />}
    </div>
  );
}
