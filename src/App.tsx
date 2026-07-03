import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { MarketplaceView } from '@/components/MarketplaceView';
import { CheckoutView } from '@/components/CheckoutView';
import { OrdersView } from '@/components/OrdersView';
import { DepositView } from '@/components/DepositView';
import { SellerDashboard } from '@/components/SellerDashboard';
import { SellerWithdrawView } from '@/components/SellerWithdrawView';
import { AdminDashboard } from '@/components/AdminDashboard';
import {
  SignInPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  EmailVerificationPage,
  UserDashboardPage,
  SellerApplicationPage,
} from '@/components/auth';
import { Toaster } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';
import './App.css';

type ViewType =
  | 'MARKETPLACE'
  | 'LOGIN'
  | 'REGISTER'
  | 'FORGOT_PASSWORD'
  | 'RESET_PASSWORD'
  | 'VERIFY_EMAIL'
  | 'DASHBOARD'
  | 'SELLER_APPLY'
  | 'CART'
  | 'CHECKOUT'
  | 'ORDERS'
  | 'DEPOSIT'
  | 'SELLER_DASHBOARD'
  | 'SELLER_PRODUCTS'
  | 'SELLER_UPLOAD'
  | 'SELLER_ORDERS'
  | 'SELLER_API'
  | 'SELLER_WITHDRAW'
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_CATEGORIES'
  | 'ADMIN_USERS'
  | 'ADMIN_DISPUTES'
  | 'ADMIN_CONFIG'
  | 'ADMIN_FINANCE'
  | 'PROFILE';

// Simple placeholder for views not yet implemented
function PlaceholderView({ title }: { title: string }) {
  const { setCurrentView, language } = useAppStore();
  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <button
          onClick={() => setCurrentView('MARKETPLACE')}
          className="text-primary hover:underline"
        >
          Back to Marketplace
        </button>
      </div>
    </div>
  );
}

function App() {
  const {
    language,
    siteConfig,
    refreshCategories,
    refreshProducts,
    refreshOrders,
    refreshCryptoTransactions,
    refreshSiteConfig,
  } = useAppStore();

  const { isAuthenticated, user, isInitialized, initialize, isLoading: authLoading } = useAuthStore();

  const [currentView, setCurrentView] = useState<ViewType>('MARKETPLACE');
  const [resetToken, setResetToken] = useState<string | undefined>();
  const [verifyToken, setVerifyToken] = useState<string | undefined>();

  // Initialize authentication on mount
  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    refreshCategories();
    refreshProducts();
    refreshOrders();
    refreshCryptoTransactions();
    refreshSiteConfig();
  }, []);

  const announcementText =
    language === 'ru'
      ? (siteConfig.announcementRu || siteConfig.announcement || '')
      : language === 'zh'
        ? (siteConfig.announcementZh || siteConfig.announcement || '')
        : (siteConfig.announcement || '');

  const handleNavigate = (view: string, token?: string) => {
    switch (view) {
      case 'login':
        setCurrentView('LOGIN');
        break;
      case 'register':
        setCurrentView('REGISTER');
        break;
      case 'forgot-password':
        setCurrentView('FORGOT_PASSWORD');
        break;
      case 'reset-password':
        setResetToken(token);
        setCurrentView('RESET_PASSWORD');
        break;
      case 'verify-email':
        setVerifyToken(token);
        setCurrentView('VERIFY_EMAIL');
        break;
      case 'dashboard':
        setCurrentView('DASHBOARD');
        break;
      case 'seller-apply':
        setCurrentView('SELLER_APPLY');
        break;
      case 'marketplace':
        setCurrentView('MARKETPLACE');
        break;
      case 'orders':
        setCurrentView('ORDERS');
        break;
      case 'deposit':
        setCurrentView('DEPOSIT');
        break;
      case 'seller-dashboard':
        setCurrentView('SELLER_DASHBOARD');
        break;
      case 'seller-products':
        setCurrentView('SELLER_PRODUCTS');
        break;
      case 'seller-upload':
        setCurrentView('SELLER_UPLOAD');
        break;
      case 'seller-orders':
        setCurrentView('SELLER_ORDERS');
        break;
      case 'seller-api':
        setCurrentView('SELLER_API');
        break;
      case 'seller-withdraw':
        setCurrentView('SELLER_WITHDRAW');
        break;
      case 'admin-dashboard':
        setCurrentView('ADMIN_DASHBOARD');
        break;
      case 'admin-categories':
        setCurrentView('ADMIN_CATEGORIES');
        break;
      case 'admin-users':
        setCurrentView('ADMIN_USERS');
        break;
      case 'admin-disputes':
        setCurrentView('ADMIN_DISPUTES');
        break;
      case 'admin-config':
        setCurrentView('ADMIN_CONFIG');
        break;
      case 'admin-finance':
        setCurrentView('ADMIN_FINANCE');
        break;
      case 'profile':
        setCurrentView('PROFILE');
        break;
      default:
        setCurrentView('MARKETPLACE');
    }
  };

  // Loading screen while auth initializes
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'MARKETPLACE':
        return <MarketplaceView />;

      // Auth pages
      case 'LOGIN':
        return <SignInPage onNavigate={handleNavigate} />;
      case 'REGISTER':
        return <RegisterPage onNavigate={handleNavigate} />;
      case 'FORGOT_PASSWORD':
        return <ForgotPasswordPage onNavigate={handleNavigate} />;
      case 'RESET_PASSWORD':
        return <ResetPasswordPage onNavigate={handleNavigate} token={resetToken} />;
      case 'VERIFY_EMAIL':
        return <EmailVerificationPage onNavigate={handleNavigate} token={verifyToken} />;
      case 'DASHBOARD':
        return isAuthenticated ? <UserDashboardPage onNavigate={handleNavigate} /> : <SignInPage onNavigate={handleNavigate} />;
      case 'SELLER_APPLY':
        return isAuthenticated ? <SellerApplicationPage onNavigate={handleNavigate} /> : <SignInPage onNavigate={handleNavigate} />;

      // E-commerce pages
      case 'CART':
      case 'CHECKOUT':
        return <CheckoutView />;
      case 'ORDERS':
        return isAuthenticated ? <OrdersView /> : <SignInPage onNavigate={handleNavigate} />;
      case 'DEPOSIT':
        return isAuthenticated ? <DepositView /> : <SignInPage onNavigate={handleNavigate} />;

      // Seller pages
      case 'SELLER_DASHBOARD':
      case 'SELLER_PRODUCTS':
      case 'SELLER_UPLOAD':
      case 'SELLER_ORDERS':
      case 'SELLER_API':
        return isAuthenticated ? <SellerDashboard /> : <SignInPage onNavigate={handleNavigate} />;
      case 'SELLER_WITHDRAW':
        return isAuthenticated ? <SellerWithdrawView /> : <SignInPage onNavigate={handleNavigate} />;

      // Admin pages
      case 'ADMIN_DASHBOARD':
      case 'ADMIN_CATEGORIES':
      case 'ADMIN_USERS':
      case 'ADMIN_DISPUTES':
      case 'ADMIN_CONFIG':
      case 'ADMIN_FINANCE':
        return isAuthenticated ? <AdminDashboard /> : <SignInPage onNavigate={handleNavigate} />;

      case 'PROFILE':
        return isAuthenticated ? <UserDashboardPage onNavigate={handleNavigate} /> : <SignInPage onNavigate={handleNavigate} />;

      default:
        return <MarketplaceView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onNavigate={handleNavigate} currentView={currentView} />

      {announcementText && (
        <div className="border-b border-primary/20 bg-primary/10">
          <div className="container py-2 text-center text-sm text-primary">
            {announcementText}
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col">
        {renderView()}
      </main>

      <Footer />
      <CartDrawer />
      <Toaster />
    </div>
  );
}

export default App;