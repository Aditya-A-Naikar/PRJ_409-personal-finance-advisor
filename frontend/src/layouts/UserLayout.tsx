import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  Target,
  TrendingUp,
  Calculator,
  MessageCircle,
  LogOut,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard",      label: "Dashboard",       icon: LayoutDashboard },
  { to: "/transactions",   label: "Transactions",    icon: Receipt },
  { to: "/budget",         label: "Budget",          icon: PiggyBank },
  { to: "/goals",          label: "Goals",           icon: Target },
  { to: "/recurring",      label: "Recurring Costs", icon: TrendingUp },
  { to: "/affordability",  label: "Affordability",   icon: Calculator },
  { to: "/advisor",        label: "AI Advisor",      icon: MessageCircle },
];

export default function UserLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col p-4">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
            <Wallet size={18} />
          </div>
          <span className="font-semibold text-slate-800">PRJ_409</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 pt-4 mt-4">
          <p className="text-xs text-slate-400 px-3 mb-2 truncate">{user?.name}</p>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 w-full transition-colors"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 p-8 overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
