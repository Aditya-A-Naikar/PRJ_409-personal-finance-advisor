import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Wallet } from "lucide-react";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const fields: { key: keyof typeof form; label: string; type: string }[] = [
    { key: "name",     label: "Full name",  type: "text"     },
    { key: "username", label: "Username",   type: "text"     },
    { key: "email",    label: "Email",      type: "email"    },
    { key: "password", label: "Password",   type: "password" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-sm">
            <Wallet size={22} />
          </div>
          <span className="font-bold text-slate-800 text-xl">PRJ_409 Finance</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-xl font-semibold text-slate-900 mb-1">Create account</h1>
          <p className="text-sm text-slate-500 mb-6">Start tracking your finances</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {label}
                </label>
                <input
                  id={`register-${key}`}
                  type={type}
                  minLength={type === "password" ? 6 : undefined}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={form[key]}
                  onChange={update(key)}
                  required
                />
              </div>
            ))}

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
