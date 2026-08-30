import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "../services/api";

interface User {
  id: number;
  user_id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  monthly_income: number;
}

interface AuthContextType {
  token: string | null;
  role: string | null;
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [role, setRole] = useState<string | null>(localStorage.getItem("role"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token && role === "USER") {
      api
        .get("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {});
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post("/auth/login", { username, password });
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("role", res.data.role);
    setToken(res.data.access_token);
    setRole(res.data.role);
    setUser(res.data.user ?? null);
  };

  const register = async (payload: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) => {
    const res = await api.post("/auth/register", payload);
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("role", res.data.role);
    setToken(res.data.access_token);
    setRole(res.data.role);
    setUser(res.data.user ?? null);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken(null);
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
