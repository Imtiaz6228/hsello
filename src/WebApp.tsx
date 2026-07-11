import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { OperationsAdminPage } from "./pages/OperationsAdminPage";
import { AdminEarningsPage } from "./pages/AdminEarningsPage";
import { AccountDashboardPage } from "./pages/AccountDashboardPage";
import { MarketplaceLandingPage } from "./pages/MarketplaceLandingPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SignInPage } from "./pages/SignInPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { VerifyRequiredPage } from "./pages/VerifyRequiredPage";
import { BlogPage } from "./pages/BlogPage";
import { CartPage } from "./pages/CartPage";
import { CatalogPage } from "./pages/CatalogPage";
import { CategoryPage } from "./pages/CategoryPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { LegalPage } from "./pages/LegalPage";
import { OrderConfirmationPage } from "./pages/OrderConfirmationPage";
import { ProductPage } from "./pages/ProductPage";
import { StorePage } from "./pages/StorePage";
import { SupportPage } from "./pages/SupportPage";
import { OrderDeliveryPage } from "./pages/OrderDeliveryPage";
import { SellerStudioPage } from "./pages/SellerStudioPage";
import { SellerApplicationPage } from "./pages/SellerApplicationPage";
import { HomepageContentBanner } from "./components/HomepageContentBanner";
import { SupportWidgetPro } from "./components/SupportWidgetPro";

export function App() {
  return (
    <><HomepageContentBanner /><SupportWidgetPro /><Routes>
      <Route path="/" element={<MarketplaceLandingPage />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/categories/:slug" element={<CategoryPage />} />
      <Route path="/products/:slug" element={<ProductPage />} />
      <Route path="/stores/:slug" element={<StorePage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/blog" element={<BlogPage />} />
      {['/terms', '/privacy', '/refund-policy', '/seller-policy', '/buyer-protection', '/prohibited-products', '/copyright', '/contact', '/about'].map((path) => <Route path={path} element={<LegalPage />} key={path} />)}
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/verify-required" element={<VerifyRequiredPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<AccountDashboardPage />} />
        <Route path="/orders/:id" element={<OrderDeliveryPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/confirmation" element={<OrderConfirmationPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={["MODERATOR", "ADMIN", "SUPER_ADMIN"]} />}>
        <Route path="/admin" element={<OperationsAdminPage />} />
        <Route path="/admin/seller-applications" element={<OperationsAdminPage />} />
        <Route path="/admin/earnings" element={<AdminEarningsPage />} />
        <Route path="/admin/approvals" element={<OperationsAdminPage />} />
        <Route path="/admin/live" element={<OperationsAdminPage />} />
        <Route path="/admin/kb/editor" element={<OperationsAdminPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={["SELLER", "ADMIN", "SUPER_ADMIN"]} />}>
        <Route path="/seller" element={<SellerStudioPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/seller/apply" element={<SellerApplicationPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></>
  );
}
