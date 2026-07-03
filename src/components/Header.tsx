import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { Icons } from './Icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { t, formatPriceRub, formatPriceUsd } from '@/lib/i18n';
import type { Category, UserRole, ViewType } from '@/types';

interface HeaderProps {
  onNavigate?: (view: string) => void;
  currentView?: string;
}

// Simple user type for display
interface DisplayUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  balanceRub?: number;
  balanceUsd?: number;
  reputation?: number;
}

export function Header({ onNavigate, currentView: externalView }: HeaderProps = {}) {
  const { 
    setIsCartOpen,
    getCartItemCount,
    searchQuery,
    setSearchQuery,
    categories,
    selectedCategory,
    setSelectedCategory,
    language,
    setLanguage,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useAppStore();

  const { user, isAuthenticated, logout } = useAuthStore();

  // Use the auth store user, with fallback to appStore user for legacy fields
  const appUser = useAppStore.getState().currentUser;
  const displayUser: DisplayUser | null = user || (appUser as unknown as DisplayUser | null);

  const setCurrentView = (view: string) => {
    if (onNavigate) {
      const map: Record<string, string> = {
        'MARKETPLACE': 'marketplace',
        'LOGIN': 'login',
        'REGISTER': 'register',
        'ORDERS': 'orders',
        'SELLER_DASHBOARD': 'seller-dashboard',
        'ADMIN_DASHBOARD': 'admin-dashboard',
        'DEPOSIT': 'deposit',
        'PROFILE': 'dashboard',
        'SELLER_PRODUCTS': 'seller-products',
        'SELLER_UPLOAD': 'seller-upload',
        'SELLER_ORDERS': 'seller-orders',
        'SELLER_API': 'seller-api',
        'SELLER_WITHDRAW': 'seller-withdraw',
        'ADMIN_FINANCE': 'admin-finance',
      };
      onNavigate(map[view] || 'marketplace');
    }
  };

  const cartItemCount = getCartItemCount();

  const navItems: { label: string; labelRu: string; labelZh: string; view: ViewType; roles?: UserRole[] }[] = [
    { label: 'Marketplace', labelRu: 'Маркетплейс', labelZh: '市场', view: 'MARKETPLACE' },
    { label: 'My Orders', labelRu: 'Мои заказы', labelZh: '我的订单', view: 'ORDERS', roles: ['BUYER', 'SELLER'] },
    { label: 'Seller Dashboard', labelRu: 'Панель продавца', labelZh: '卖家面板', view: 'SELLER_DASHBOARD', roles: ['SELLER'] },
    { label: 'Admin Panel', labelRu: 'Панель админа', labelZh: '管理面板', view: 'ADMIN_DASHBOARD', roles: ['ADMIN'] },
  ];

  const getNavLabel = (item: typeof navItems[0]) => {
    if (language === 'ru') return item.labelRu;
    if (language === 'zh') return item.labelZh;
    return item.label;
  };

  const getLocalizedText = (en: string, ru: string, zh: string) => {
    if (language === 'ru') return ru;
    if (language === 'zh') return zh;
    return en;
  };

  const getCategoryName = (category: Category) => {
    if (language === 'ru') return category.nameRu;
    if (language === 'zh') return category.nameZh;
    return category.name;
  };

  const flattenCategories = (
    items: Category[],
    level = 0
  ): Array<{ category: Category; level: number }> =>
    items.flatMap((item) => [
      { category: item, level },
      ...(item.children ? flattenCategories(item.children, level + 1) : []),
    ]);

  const categoryOptions = flattenCategories(categories);
  const selectedCategoryOption = selectedCategory
    ? categoryOptions.find((item) => item.category.id === selectedCategory)
    : undefined;
  const selectedCategoryName = selectedCategoryOption
    ? getCategoryName(selectedCategoryOption.category)
    : getLocalizedText('All Categories', 'Все категории', '所有类别');

  const goMarketplaceHome = (closeMobileMenu = false) => {
    setSelectedCategory(null);
    setSearchQuery('');
    setCurrentView('MARKETPLACE');
    if (closeMobileMenu) {
      setIsMobileMenuOpen(false);
    }
  };

  const userRole = displayUser?.role || 'CUSTOMER';
  const isUserSeller = userRole === 'SELLER';
  const isUserAdmin = userRole === 'ADMIN';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
      <div className="hidden md:block border-b border-border/50 bg-secondary/30">
        <div className="container flex h-8 items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Icons.Shield className="h-3.5 w-3.5 text-emerald-400" />
              {getLocalizedText('Verified sellers only', 'Только проверенные продавцы', '仅限已验证卖家')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icons.Clock className="h-3.5 w-3.5 text-blue-400" />
              {getLocalizedText('Instant order delivery', 'Мгновенная выдача заказов', '订单即时交付')}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <Icons.HelpCircle className="h-3.5 w-3.5 text-primary" />
            {getLocalizedText('24/7 dispute support', 'Поддержка споров 24/7', '7x24 争议支持')}
          </span>
        </div>
      </div>

      <div className="container flex h-16 items-center">
        {/* Mobile Menu Button */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden mr-2">
            <Button variant="ghost" size="icon">
              <Icons.Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Icons.Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                hsello.com
              </SheetTitle>
            </SheetHeader>
            <div className="py-4">
              {navItems
                .filter(item => !item.roles || (displayUser && item.roles.includes(userRole as UserRole)))
                .map(item => (
                  <button
                    key={item.view}
                    className={cn(
                      "w-full px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-secondary",
                      externalView === item.view && "bg-primary/10 text-primary"
                    )}
                    onClick={() => {
                      if (item.view === 'MARKETPLACE') {
                        goMarketplaceHome(true);
                      } else {
                        setCurrentView(item.view);
                        setIsMobileMenuOpen(false);
                      }
                    }}
                  >
                    {getNavLabel(item)}
                  </button>
                ))}
              
              {!isAuthenticated && (
                <>
                  <div className="my-2 border-t" />
                  <button className="w-full px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-secondary"
                    onClick={() => { setCurrentView('LOGIN'); setIsMobileMenuOpen(false); }}>
                    Sign In
                  </button>
                  <button className="w-full px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-secondary"
                    onClick={() => { setCurrentView('REGISTER'); setIsMobileMenuOpen(false); }}>
                    Register
                  </button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <div 
          className="mr-3 flex items-center gap-2.5 cursor-pointer"
          onClick={() => goMarketplaceHome()}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-500 shadow-lg shadow-primary/20">
            <Icons.Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <p className="font-semibold leading-none">hsello.com</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">digital marketplace</p>
          </div>
        </div>

        {/* Category + Search */}
        <div className="flex-1 px-2 md:px-4">
          <div className="max-w-3xl flex items-center gap-2 rounded-xl border border-border/70 bg-card/70 p-1.5 shadow-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 min-w-[132px] sm:min-w-[170px] justify-between rounded-lg border-border/70 bg-background/60 px-2.5"
                >
                  <span className="truncate text-xs sm:text-sm">{selectedCategoryName}</span>
                  <Icons.ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
                <DropdownMenuItem onClick={() => { setSelectedCategory(null); setCurrentView('MARKETPLACE'); }}>
                  <Icons.List className="mr-2 h-4 w-4" />
                  {t('allCategories', language)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {categoryOptions.map(({ category, level }) => (
                  <DropdownMenuItem
                    key={category.id}
                    onClick={() => { setSelectedCategory(category.id); setCurrentView('MARKETPLACE'); }}
                    className="pr-2"
                    style={{ paddingLeft: `${8 + level * 12}px` }}
                  >
                    <span className="truncate">{getCategoryName(category)}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="relative flex-1 min-w-0">
              <Icons.Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('search', language)}
                className="h-9 rounded-lg border-border/60 bg-background/60 pl-9 text-sm"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (externalView !== 'MARKETPLACE') {
                    setCurrentView('MARKETPLACE');
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1 mr-3">
          {navItems
            .filter(item => !item.roles || (displayUser && item.roles.includes(userRole as UserRole)))
            .map(item => (
              <Button
                key={item.view}
                variant={externalView === item.view ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'rounded-lg px-3',
                  externalView === item.view && 'bg-primary/15 text-primary hover:bg-primary/20'
                )}
                onClick={() => {
                  if (item.view === 'MARKETPLACE') {
                    goMarketplaceHome();
                  } else {
                    setCurrentView(item.view);
                  }
                }}
              >
                {getNavLabel(item)}
              </Button>
            ))}
        </nav>

        {/* Right Section */}
        <div className="flex items-center space-x-1 md:space-x-2">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Icons.Languages className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage('en')}>
                <span className={cn(language === 'en' && 'font-bold')}>English</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('ru')}>
                <span className={cn(language === 'ru' && 'font-bold')}>Русский</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('zh')}>
                <span className={cn(language === 'zh' && 'font-bold')}>中文</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Cart Button */}
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-lg border border-transparent hover:border-border/70 hover:bg-secondary/70"
            onClick={() => setIsCartOpen(true)}
          >
            <Icons.ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {cartItemCount}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          {isAuthenticated && displayUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 rounded-lg border border-transparent md:gap-2 hover:border-border/70 hover:bg-secondary/70">
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Icons.User className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="hidden sm:inline text-xs md:text-sm">
                    {displayUser.firstName || displayUser.username || displayUser.email.split('@')[0]}
                  </span>
                  {isUserSeller && (
                    <Badge variant="outline" className="text-[10px] md:text-xs hidden md:inline">Seller</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{displayUser.email}</p>
                  <p className="text-xs text-muted-foreground">{userRole}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setCurrentView('PROFILE'); }}>
                  <Icons.User className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                {isUserSeller && (
                  <>
                    <DropdownMenuItem onClick={() => setCurrentView('SELLER_DASHBOARD')}>
                      <Icons.Package className="mr-2 h-4 w-4" />
                      Seller Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCurrentView('SELLER_PRODUCTS')}>
                      <Icons.Package className="mr-2 h-4 w-4" />
                      My Products
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCurrentView('SELLER_WITHDRAW')}>
                      <Icons.Wallet className="mr-2 h-4 w-4" />
                      Withdraw
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {isUserAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => setCurrentView('ADMIN_DASHBOARD')}>
                      <Icons.Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={logout}>
                  <Icons.LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden xl:flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="rounded-lg"
                onClick={() => setCurrentView('LOGIN')}>
                Sign In
              </Button>
              <Button variant="default" size="sm" className="rounded-lg bg-primary/95"
                onClick={() => setCurrentView('REGISTER')}>
                Register
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}