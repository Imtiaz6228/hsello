import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { HeroSection } from './HeroSection';
import { ProductGrid } from './ProductGrid';
import { CategorySidebar } from './CategorySidebar';
import { MobileCategoryFilter } from './MobileCategoryFilter';
import { Input } from '@/components/ui/input';
import { Icons } from './Icons';
import { t } from '@/lib/i18n';

export function MarketplaceView() {
  const { searchQuery, setSearchQuery, language, selectedCategory } = useAppStore();
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  const hasActiveFilters = !!selectedCategory || !!searchQuery;

  const clearFilters = () => {
    const { setSelectedCategory } = useAppStore.getState();
    setSelectedCategory(null);
    setSearchQuery('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Hero Section - Only show when no category selected */}
      {!selectedCategory && <HeroSection />}

      {hasActiveFilters && (
        <div className="container pt-4 md:pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/75 px-4 py-3 text-sm shadow-sm">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Icons.Filter className="h-3.5 w-3.5" />
              </span>
              {language === 'ru'
                ? 'Применены фильтры каталога'
                : language === 'zh'
                  ? '已应用目录筛选条件'
                  : 'Catalog filters are active'}
            </div>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2.5 py-1.5 font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Icons.X className="h-3.5 w-3.5" />
              {language === 'ru' ? 'Сбросить фильтры' : language === 'zh' ? '清除筛选' : 'Clear filters'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <div className="hidden w-64 border-r border-border/70 bg-card/30 md:block lg:w-72">
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <CategorySidebar />
          </div>
        </div>

        {/* Mobile Category Filter */}
        <MobileCategoryFilter 
          isOpen={showMobileFilter} 
          onClose={() => setShowMobileFilter(false)} 
        />

        {/* Product Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile Filter Button & Search */}
          <div className="space-y-3 border-b border-border/70 p-4 md:hidden">
            {(selectedCategory || searchQuery) && (
              <button
                onClick={clearFilters}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-2.5 text-primary"
              >
                <Icons.Home className="h-4 w-4" />
                {language === 'ru' ? 'На главную (сброс)' : language === 'zh' ? '返回首页（清除筛选）' : 'Go Home (clear filters)'}
              </button>
            )}

            <button
              onClick={() => setShowMobileFilter(true)}
              className="flex w-full items-center justify-between rounded-lg border border-border/70 bg-card/70 p-3"
            >
              <span className="flex items-center gap-2">
                <Icons.List className="h-4 w-4" />
                {t('categories', language)}
              </span>
              <Icons.ChevronRight className="h-4 w-4" />
            </button>
            
            <div className="relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('search', language)}
                className="h-10 rounded-lg border-border/70 bg-card/70 pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Products Grid */}
          <ProductGrid />
        </div>
      </div>
    </div>
  );
}
