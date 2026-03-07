import { useAppStore } from '@/store/appStore';
import { db } from '@/store/database';
import { Icons } from './Icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { t } from '@/lib/i18n';

export function HeroSection() {
  const { setCurrentView, setAuthPreferredRole, setSelectedCategory, language, categories } = useAppStore();

  const getText = (en: string, ru: string, zh: string) => {
    if (language === 'ru') return ru;
    if (language === 'zh') return zh;
    return en;
  };

  const getCategoryName = (cat: { name: string; nameRu: string; nameZh: string }) => {
    if (language === 'ru') return cat.nameRu;
    if (language === 'zh') return cat.nameZh;
    return cat.name;
  };

  const topCategories = categories.slice(0, 6);
  const topProducts = db.getRankedProducts(3);
  const topStores = db.getRankedStores(3);
  const topSales = topProducts.reduce((sum, p) => sum + p.soldQty, 0);

  return (
    <section className="relative overflow-hidden border-b border-border/70 bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-16 top-12 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="container relative space-y-6 py-10 md:py-14">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-sm md:p-8">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                <Icons.Shield className="mr-1 h-3.5 w-3.5" />
                {getText('Trusted marketplace', 'Надежный маркетплейс', '可信交易平台')}
              </Badge>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                <Icons.Zap className="mr-1 h-3.5 w-3.5" />
                {getText('Instant delivery', 'Мгновенная выдача', '即时交付')}
              </Badge>
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">
              {getText('Buy and scale with', 'Покупайте и масштабируйтесь с', '用更高效的方式采购并扩展')}{' '}
              <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                {getText('premium trust + speed', 'премиальным доверием и скоростью', '高信任与高速度')}
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
              {getText(
                'A professional digital marketplace with verified sellers, clear reputation, and automated delivery after payment.',
                'Профессиональный маркетплейс цифровых аккаунтов: проверенные продавцы, прозрачная репутация и авто-выдача после оплаты.',
                '专业数字账号市场：已验证卖家、透明信誉体系、付款后自动交付。'
              )}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="gap-2" onClick={() => setCurrentView('MARKETPLACE')}>
                <Icons.ShoppingCart className="h-4 w-4" />
                {t('startBuying', language)}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setAuthPreferredRole('SELLER');
                  setCurrentView('REGISTER');
                }}
              >
                <Icons.Package className="h-4 w-4" />
                {t('startSelling', language)}
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-xl font-semibold md:text-2xl">{categories.length}+</p>
                <p className="text-xs text-muted-foreground">{getText('Categories', 'Категорий', '分类')}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-xl font-semibold md:text-2xl">{topSales}+</p>
                <p className="text-xs text-muted-foreground">{getText('Top sales', 'Топ-продажи', '热门销量')}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-xl font-semibold md:text-2xl">99%+</p>
                <p className="text-xs text-muted-foreground">{getText('Buyer satisfaction', 'Удовлетворенность', '用户满意度')}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-xl font-semibold md:text-2xl">24/7</p>
                <p className="text-xs text-muted-foreground">{getText('Support', 'Поддержка', '支持')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Icons.TrendingUp className="h-4 w-4 text-primary" />
                {getText('Live market pulse', 'Пульс рынка', '实时市场动态')}
              </h3>
              <div className="space-y-2">
                {topProducts.map((product, idx) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedCategory(product.categoryId);
                      setCurrentView('MARKETPLACE');
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        #{idx + 1} {language === 'ru' ? product.titleRu : language === 'zh' ? product.titleZh : product.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {product.soldQty} {getText('sales', 'продаж', '销量')}
                      </p>
                    </div>
                    <Badge variant="outline">{product.seller?.reputation.toFixed(1)}%</Badge>
                  </button>
                ))}
              </div>

              <div className="mt-4 border-t border-border/60 pt-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {getText('Top stores', 'Топ-магазины', '热门店铺')}
                </h4>
                <div className="space-y-2">
                  {topStores.map((store, idx) => (
                    <div key={store.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/55 px-3 py-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full border border-border/60 overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
                          {store.storeLogoUrl ? (
                            <img src={store.storeLogoUrl} alt={store.storeName || store.email} className="h-full w-full object-cover" />
                          ) : (
                            <Icons.Package className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm">
                            #{idx + 1} {store.storeName || store.supplierId || store.email}
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {getText('Insurance', 'Страховка', '保险金')}: {store.insuranceLevel || 'NONE'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            store.insuranceLevel === 'LEVEL_1'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : store.insuranceLevel === 'LEVEL_2'
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                : store.insuranceLevel === 'LEVEL_3'
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                  : 'bg-muted text-muted-foreground border-border'
                          }
                        >
                          {store.insuranceLevel || 'NONE'}
                        </Badge>
                        <Badge variant="outline">{store.reputation.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold">
                {getText('Popular categories', 'Популярные категории', '热门分类')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {topCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setCurrentView('MARKETPLACE');
                    }}
                    className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-left text-xs transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <p className="truncate font-medium">{getCategoryName(cat)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(cat.stockCount || 0)} {getText('in stock', 'в наличии', '库存')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}