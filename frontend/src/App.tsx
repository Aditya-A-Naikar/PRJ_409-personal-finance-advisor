import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserLayout from "./layouts/UserLayout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budget from "./pages/Budget";
import Placeholder from "./pages/Placeholder";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected user routes */}
          <Route element={<ProtectedRoute role="USER" />}>
            <Route element={<UserLayout />}>
              <Route path="/dashboard"     element={<Dashboard />} />
              <Route path="/transactions"  element={<Transactions />} />
              <Route path="/budget"        element={<Budget />} />
              <Route path="/goals"         element={<Placeholder title="Goals" />} />
              <Route path="/recurring"     element={<Placeholder title="Recurring Costs" />} />
              <Route path="/affordability" element={<Placeholder title="Affordability" />} />
              <Route path="/advisor"       element={<Placeholder title="AI Advisor" />} />
            </Route>
          </Route>

          {/* Catch-all → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
