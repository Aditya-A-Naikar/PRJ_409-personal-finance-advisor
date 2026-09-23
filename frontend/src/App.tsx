import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserLayout from "./layouts/UserLayout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budget from "./pages/Budget";
import Goals from "./pages/Goals";
import Recurring from "./pages/Recurring";
import Affordability from "./pages/Affordability";
import Advisor from "./pages/Advisor";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";

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
            <Route path="/onboarding"    element={<Onboarding />} />
            <Route element={<UserLayout />}>
              <Route path="/dashboard"     element={<Dashboard />} />
              <Route path="/transactions"  element={<Transactions />} />
              <Route path="/budget"        element={<Budget />} />
              <Route path="/goals"         element={<Goals />} />
              <Route path="/recurring"     element={<Recurring />} />
              <Route path="/affordability" element={<Affordability />} />
              <Route path="/advisor"       element={<Advisor />} />
              <Route path="/profile"       element={<Profile />} />
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
