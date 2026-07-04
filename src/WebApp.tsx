import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AdminPanelPage } from "./pages/AdminPanelPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MarketplaceHomePage } from "./pages/MarketplaceHomePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SignInPage } from "./pages/SignInPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { VerifyRequiredPage } from "./pages/VerifyRequiredPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketplaceHomePage />} />
      <Route path="/catalog" element={<MarketplaceHomePage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/verify-required" element={<VerifyRequiredPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={["MODERATOR", "ADMIN", "SUPER_ADMIN"]} />}>
        <Route path="/admin" element={<AdminPanelPage />} />
        <Route path="/admin/seller-applications" element={<AdminPanelPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
