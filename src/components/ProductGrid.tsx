import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Icons } from './Icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatNumber, formatPriceRub, formatPriceUsd } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { Category, Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  const { addToCart, language } = useAppStore();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    const result = addToCart(product.id, quantity);
    if (result.success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  };

  const effectivePrice = useMemo(() => {
    const bulkPrice = product.bulkPrices.find((bp) => quantity >= bp.minQty && quantity <= bp.maxQty);
    return bulkPrice || { priceRub: product.priceRub, priceUsd: product.priceUsd };
  }, [product.bulkPrices, product.priceRub, product.priceUsd, quantity]);

  const stockCount = product.stockCount || 0;
  const displayTitle = language === 'ru' ? product.titleRu : language === 'zh' ? product.titleZh : product.title;
  const displayTags = language === 'ru' ? product.tagsRu : product.tags;
  const sellerLabel =
    product.seller?.storeName ||
    product.seller?.supplierId ||
    (language === 'ru' ? 'Магазин' : language === 'zh' ? '店铺' : 'Store');
  const sellerInsuranceLevel = product.seller?.insuranceLevel || 'NONE';
  const totalRub = effectivePrice.priceRub * quantity;
  const totalUsd = effectivePrice.priceUsd * quantity;
  const savings = product.priceRub > effectivePrice.priceRub ? product.priceRub - effectivePrice.priceRub : 0;

  const IconComponent =
    (Icons as Record<string, React.ComponentType<{ className?: string }>>)[product.category?.icon || 'Package'] || Icons.Package;

  const stockTone =
    stockCount >= 100
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : stockCount >= 20
        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        : 'bg-red-500/15 text-red-400 border-red-500/30';

  const getTagColor = (tag: string) => {
    const tagLower = tag.toLowerCase();
    if (
      tagLower.includes('verified') ||
      tagLower.includes('real') ||
      tagLower.includes('pva') ||
      tagLower.includes('верифицирован')
    ) {
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
    if (tagLower.includes('retriv') || tagLower.includes('aged') || tagLower.includes('возрастной')) {
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
    if (
      tagLower.includes('no warranty') ||
      tagLower.includes('shared') ||
      tagLower.includes('без гарантии') ||
      tagLower.includes('общий')
    ) {
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
    return 'bg-secondary/70 text-secondary-foreground border-border/70';
  };

  return (
    <Card className="group relative overflow-hidden border border-border/70 bg-card/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/55 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/0 via-primary to-cyan-400/0 opacity-60 transition-opacity group-hover:opacity-100" />

      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-background/70">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={displayTitle} className="h-full w-full object-cover" />
              ) : (
                <IconComponent className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="break-words text-sm font-semibold leading-5" title={displayTitle}>
                {displayTitle}
              </h3>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {product.seller?.storeLogoUrl ? (
                  <img
                    src={product.seller.storeLogoUrl}
                    alt={sellerLabel}
                    className="h-4 w-4 rounded-full border border-border/70 object-cover"
                  />
                ) : (
                  <Icons.User className="h-3 w-3" />
                )}
                <span className="truncate">{sellerLabel}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-4 px-1 text-[9px]',
                    sellerInsuranceLevel === 'LEVEL_1'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : sellerInsuranceLevel === 'LEVEL_2'
                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                        : sellerInsuranceLevel === 'LEVEL_3'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          : 'bg-muted text-muted-foreground border-border'
                  )}
                >
                  {sellerInsuranceLevel}
                </Badge>
                {product.seller?.reputation ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <Icons.Star className="h-3 w-3" />
                    {product.seller.reputation.toFixed(1)}%
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <Badge variant="outline" className={cn('shrink-0 border text-[10px] font-medium', stockTone)}>
            {stockCount}
          </Badge>
        </div>

        <div className="flex min-h-6 flex-wrap gap-1">
          {displayTags.slice(0, 2).map((tag, i) => (
            <Badge key={i} variant="outline" className={cn('h-5 px-1.5 py-0 text-[10px]', getTagColor(tag))}>
              {tag}
            </Badge>
          ))}
          {displayTags.length > 2 && (
            <Badge variant="outline" className="h-5 border-border/70 bg-secondary/50 px-1.5 py-0 text-[10px] text-muted-foreground">
              +{displayTags.length - 2}
            </Badge>
          )}
        </div>

        <div className="rounded-xl border border-border/70 bg-background/60 p-3">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {language === 'ru' ? 'цена за шт.' : language === 'zh' ? '单价' : 'Unit price'}
              </p>
              <p className="text-sm font-semibold">{formatPriceRub(effectivePrice.priceRub)}</p>
              <p className="text-[11px] text-muted-foreground">{formatPriceUsd(effectivePrice.priceUsd)}</p>
            </div>

            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {language === 'ru' ? 'итого' : language === 'zh' ? '合计' : 'Total'}
              </p>
              <p className="text-base font-bold text-primary">{formatPriceRub(totalRub)}</p>
              <p className="text-[11px] text-muted-foreground">{formatPriceUsd(totalUsd)}</p>
            </div>
          </div>

          {savings > 0 && (
            <div className="mb-3 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-400">
              {language === 'ru'
                ? `Экономия: ${formatPriceRub(savings)} за штуку`
                : language === 'zh'
                  ? `节省：每件 ${formatPriceRub(savings)}`
                  : `Savings: ${formatPriceRub(savings)} per item`}
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-border/70 bg-card/60">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-2 py-1.5 hover:bg-secondary disabled:opacity-40"
                disabled={quantity <= 1}
              >
                <Icons.Minus className="h-3 w-3" />
              </button>
              <span className="min-w-[2.25rem] px-2 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(stockCount, quantity + 1))}
                className="px-2 py-1.5 hover:bg-secondary disabled:opacity-40"
                disabled={quantity >= stockCount}
              >
                <Icons.Plus className="h-3 w-3" />
              </button>
            </div>

            <Button
              size="sm"
              className="h-8 flex-1 rounded-md"
              onClick={handleAddToCart}
              disabled={stockCount === 0 || added}
            >
              {added ? (
                <>
                  <Icons.Check className="mr-1 h-4 w-4" />
                  {language === 'ru' ? 'Добавлено' : language === 'zh' ? '已添加' : 'Added'}
                </>
              ) : (
                <>
                  <Icons.Plus className="mr-1 h-4 w-4" />
                  {t('addToCart', language)}
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {language === 'ru' ? 'В наличии:' : language === 'zh' ? '库存：' : 'Stock:'}{' '}
            <span className="font-medium text-foreground">{formatNumber(stockCount)}</span>
          </span>

          {product.bulkPrices.length > 0 && (
            <span>
              {language === 'ru' ? 'Опт от' : language === 'zh' ? '批发低至' : 'Bulk from'}{' '}
              <span className="font-medium text-foreground">
                {formatPriceRub(product.bulkPrices[product.bulkPrices.length - 1].priceRub)}
              </span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductGrid() {
  const { products, selectedCategory, categories, language, searchQuery, setSelectedCategory } = useAppStore();
  const [sortBy, setSortBy] = useState<'price' | 'stock'>('price');

  const getText = (en: string, ru: string, zh: string) => {
    if (language === 'ru') return ru;
    if (language === 'zh') return zh;
    return en;
  };

  const getCategoryName = (category: Category) => {
    if (language === 'ru') return category.nameRu;
    if (language === 'zh') return category.nameZh;
    return category.name;
  };

  const sortProducts = (items: Product[]) => {
    const sorted = [...items];
    if (sortBy === 'price') {
      sorted.sort((a, b) => a.priceRub - b.priceRub);
    } else {
      sorted.sort((a, b) => (b.stockCount || 0) - (a.stockCount || 0));
    }
    return sorted;
  };

  const flattenCategories = (nodes: Category[]): Category[] =>
    nodes.flatMap((node) => [node, ...(node.children ? flattenCategories(node.children) : [])]);

  const allCategories = flattenCategories(categories);
  const selectedCategoryObj = selectedCategory ? allCategories.find((c) => c.id === selectedCategory) : null;
  const showCategorySections = !selectedCategory && !searchQuery;
  const sortedProducts = useMemo(() => sortProducts(products), [products, sortBy]);

  const categorySections = useMemo(
    () =>
      showCategorySections
        ? allCategories
            .map((category) => {
              const items = sortProducts(products.filter((product) => product.categoryId === category.id));
              if (!items.length) return null;
              return {
                category,
                products: items.slice(0, 8),
                totalCount: items.length,
              };
            })
            .filter((section): section is { category: Category; products: Product[]; totalCount: number } => section !== null)
        : [],
    [allCategories, products, showCategorySections, sortBy]
  );

  const inStockCount = sortedProducts.filter((item) => (item.stockCount || 0) > 0).length;

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="mb-6 rounded-2xl border border-border/70 bg-card/75 p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {showCategorySections
                ? getText('Premium Product Catalog', 'Премиальный каталог товаров', '高端商品目录')
                : selectedCategoryObj
                  ? getCategoryName(selectedCategoryObj)
                  : t('allProducts', language)}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {showCategorySections
                ? `${categorySections.length} ${getText('categories with active products', 'категорий с товарами', '个有商品的分类')}`
                : `${sortedProducts.length} ${getText('products found', 'товаров найдено', '件商品')}`}
            </p>
            {!showCategorySections && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="border-border/70 bg-secondary/50">
                  {getText('In stock', 'В наличии', '有库存')}: {inStockCount}
                </Badge>
                <Badge variant="outline" className="border-border/70 bg-secondary/50">
                  {getText('Total', 'Всего', '总计')}: {sortedProducts.length}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{getText('Sort:', 'Сортировка:', '排序：')}</span>
            <div className="flex overflow-hidden rounded-lg border border-border/70 bg-background/60">
              <button
                onClick={() => setSortBy('price')}
                className={cn(
                  'px-3 py-1.5 text-sm transition-colors',
                  sortBy === 'price' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                )}
              >
                {getText('Price', 'Цена', '价格')}
              </button>
              <button
                onClick={() => setSortBy('stock')}
                className={cn(
                  'px-3 py-1.5 text-sm transition-colors',
                  sortBy === 'stock' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                )}
              >
                {getText('Stock', 'Наличие', '库存')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCategorySections ? (
        <div className="space-y-8">
          {categorySections.map((section) => (
            <section key={section.category.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{getCategoryName(section.category)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {section.totalCount} {getText('products', 'товаров', '商品')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setSelectedCategory(section.category.id)}
                >
                  {getText('Show all', 'Показать все', '查看全部')}
                  <Icons.ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {section.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : sortedProducts.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 py-16 text-center">
          <Icons.Package className="mb-4 h-16 w-16 opacity-30" />
          <p className="text-lg font-medium text-muted-foreground">
            {getText('No products found', 'Товары не найдены', '未找到产品')}
          </p>
          <p className="text-sm text-muted-foreground">
            {getText(
              'Try a different category or search query',
              'Попробуйте другую категорию или поисковый запрос',
              '尝试其他分类或搜索词'
            )}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setSelectedCategory(null)}>
            {getText('Show all categories', 'Показать все категории', '显示所有分类')}
          </Button>
        </div>
      )}
    </div>
  );
}