import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { MarketplaceView } from '@/components/MarketplaceView';
import { LoginView } from '@/components/LoginView';
import { CheckoutView } from '@/components/CheckoutView';
import { OrdersView } from '@/components/OrdersView';
import { DepositView } from '@/components/DepositView';
import { SellerDashboard } from '@/components/SellerDashboard';
import { SellerWithdrawView } from '@/components/SellerWithdrawView';
import { AdminDashboard } from '@/components/AdminDashboard';
import { Toaster } from '@/components/ui/sonner';
import './App.css';

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
          {language === 'ru' ? 'Назад на маркетплейс' : language === 'zh' ? '返回市场' : 'Back to Marketplace'}
        </button>
      </div>
    </div>
  );
}

function App() {
  const {
    currentView,
    language,
    siteConfig,
    refreshCategories,
    refreshProducts,
    refreshOrders,
    refreshCryptoTransactions,
    refreshSiteConfig,
  } = useAppStore();

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

  const renderView = () => {
    switch (currentView) {
      case 'MARKETPLACE':
        return <MarketplaceView />;
      case 'LOGIN':
      case 'REGISTER':
        return <LoginView />;
      case 'CART':
      case 'CHECKOUT':
        return <CheckoutView />;
      case 'ORDERS':
        return <OrdersView />;
      case 'DEPOSIT':
        return <DepositView />;
      case 'SELLER_DASHBOARD':
      case 'SELLER_PRODUCTS':
      case 'SELLER_UPLOAD':
      case 'SELLER_ORDERS':
      case 'SELLER_API':
        return <SellerDashboard />;
      case 'SELLER_WITHDRAW':
        return <SellerWithdrawView />;
      case 'ADMIN_DASHBOARD':
      case 'ADMIN_CATEGORIES':
      case 'ADMIN_USERS':
      case 'ADMIN_DISPUTES':
      case 'ADMIN_CONFIG':
      case 'ADMIN_FINANCE':
        return <AdminDashboard />;
      case 'PROFILE':
        return <PlaceholderView title="Profile" />;
      default:
        return <MarketplaceView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

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
