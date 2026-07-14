import { lazy, Suspense, type ComponentType } from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { HomepageContentBanner } from "./components/HomepageContentBanner";
import { SupportWidgetPro } from "./components/SupportWidgetPro";

function page<T extends Record<string, ComponentType>>(loader: () => Promise<T>, name: keyof T) {
  return lazy(async () => ({ default: (await loader())[name] }));
}

const MarketplaceLandingPage = page(() => import("./pages/MarketplaceLandingPage"), "MarketplaceLandingPage");
const CatalogPage = page(() => import("./pages/CatalogPage"), "CatalogPage");
const CategoryPage = page(() => import("./pages/CategoryPage"), "CategoryPage");
const ProductPage = page(() => import("./pages/ProductPage"), "ProductPage");
const StorePage = page(() => import("./pages/StorePage"), "StorePage");
const CartPage = page(() => import("./pages/CartPage"), "CartPage");
const BlogPage = page(() => import("./pages/BlogPage"), "BlogPage");
const LegalPage = page(() => import("./pages/LegalPage"), "LegalPage");
const SignInPage = page(() => import("./pages/SignInPage"), "SignInPage");
const ForgotPasswordPage = page(() => import("./pages/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = page(() => import("./pages/ResetPasswordPage"), "ResetPasswordPage");
const RegisterPage = page(() => import("./pages/RegisterPage"), "RegisterPage");
const VerifyEmailPage = page(() => import("./pages/VerifyEmailPage"), "VerifyEmailPage");
const VerifyRequiredPage = page(() => import("./pages/VerifyRequiredPage"), "VerifyRequiredPage");
const AccountDashboardPage = page(() => import("./pages/AccountDashboardPage"), "AccountDashboardPage");
const OrderDeliveryPage = page(() => import("./pages/OrderDeliveryPage"), "OrderDeliveryPage");
const CheckoutPage = page(() => import("./pages/CheckoutPage"), "CheckoutPage");
const OrderConfirmationPage = page(() => import("./pages/OrderConfirmationPage"), "OrderConfirmationPage");
const SupportPage = page(() => import("./pages/SupportPage"), "SupportPage");
const SignOutPage = page(() => import("./pages/SignOutPage"), "SignOutPage");
const OperationsAdminPage = page(() => import("./pages/OperationsAdminPage"), "OperationsAdminPage");
const AdminEarningsPage = page(() => import("./pages/AdminEarningsPage"), "AdminEarningsPage");
const SellerStudioPage = page(() => import("./pages/SellerStudioPage"), "SellerStudioPage");
const SellerApplicationPage = page(() => import("./pages/SellerApplicationPage"), "SellerApplicationPage");
const NotFoundPage = page(() => import("./pages/NotFoundPage"), "NotFoundPage");

function RouteLoading() {
  return <main className="route-loading" aria-live="polite" aria-busy="true"><span /><span /><span /><strong>Loading page…</strong></main>;
}

export function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <HomepageContentBanner />
      <SupportWidgetPro />
      <div id="main-content"><Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<MarketplaceLandingPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/stores/:slug" element={<StorePage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPage />} />
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
            <Route path="/sign-out" element={<SignOutPage />} />
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
          <Route element={<ProtectedRoute />}><Route path="/seller/apply" element={<SellerApplicationPage />} /></Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense></div>
    </>
  );
}
