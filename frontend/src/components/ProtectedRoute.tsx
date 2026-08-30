import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  role?: string;
}

export default function ProtectedRoute({ role }: Props) {
  const { token, role: currentRole, loading } = useAuth();
  if (loading) return null;
  if (!token) return <Navigate to="/login" replace />;
  if (role && currentRole !== role) return <Navigate to="/login" replace />;
  return <Outlet />;
}
