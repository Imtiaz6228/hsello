import { useAppStore } from '@/store/appStore';
import { Icons } from './Icons';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatPriceRub, formatPriceUsd } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { db } from '@/store/database';
import { calculatePlatformFee } from '@/lib/platform';

export function CartDrawer() {
  const { 
    cart, 
    isCartOpen, 
    setIsCartOpen, 
    removeFromCart, 
    updateCartQuantity,
    clearCart,
    getCartTotalRub,
    getCartTotalUsd,
    setCurrentView,
    language,
  } = useAppStore();

  const handleCheckout = () => {
    setIsCartOpen(false);
    setCurrentView('CHECKOUT');
  };

  const subtotalRub = getCartTotalRub();
  const subtotalUsd = getCartTotalUsd();
  const feeInfo = calculatePlatformFee(subtotalRub, subtotalUsd);
  const platformFeeRub = feeInfo.feeRub;
  const platformFeeUsd = feeInfo.feeUsd;
  const totalRub = subtotalRub + platformFeeRub;
  const totalUsd = subtotalUsd + platformFeeUsd;

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icons.ShoppingCart className="h-5 w-5" />
            {t('shoppingCart', language)}
            <span className="text-sm font-normal text-muted-foreground">
              ({cart.length} {language === 'ru' ? 'товаров' : language === 'zh' ? '商品' : 'items'})
            </span>
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Icons.ShoppingCart className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">{t('emptyCart', language)}</p>
            <p className="text-sm">
              {language === 'ru' ? 'Добавьте товары в корзину' : 
               language === 'zh' ? '添加商品到购物车' : 
               'Add some products to get started'}
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="-mx-6 flex-1 px-6">
              <div className="space-y-4">
                {cart.map((item) => {
                  const product = db.getProductById(item.productId);
                  if (!product) return null;

                  const bulkPrice = product.bulkPrices.find(
                    bp => item.quantity >= bp.minQty && item.quantity <= bp.maxQty
                  );
                  const unitPriceRub = bulkPrice ? bulkPrice.priceRub : product.priceRub;
                  const unitPriceUsd = bulkPrice ? bulkPrice.priceUsd : product.priceUsd;
                  const itemTotalRub = unitPriceRub * item.quantity;
                  const itemTotalUsd = unitPriceUsd * item.quantity;

                  const displayTitle = language === 'ru' ? product.titleRu : language === 'zh' ? product.titleZh : product.title;

                  return (
                    <div key={item.productId} className="flex gap-3 rounded-xl border border-border/70 bg-card/70 p-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{displayTitle}</h4>
                        <p className="text-xs text-muted-foreground">
                          {product.seller?.supplierId}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            className="flex h-6 w-6 items-center justify-center rounded border border-border/70 hover:bg-secondary"
                            onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          >
                            <Icons.Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            className="flex h-6 w-6 items-center justify-center rounded border border-border/70 hover:bg-secondary"
                            onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          >
                            <Icons.Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPriceRub(itemTotalRub)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPriceUsd(itemTotalUsd)}
                        </p>
                        <button
                          className="text-xs text-destructive mt-2 hover:underline"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          {language === 'ru' ? 'Удалить' : language === 'zh' ? '删除' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="space-y-4 pt-4">
              <Separator />
              
              <div className="space-y-2 rounded-xl border border-border/70 bg-card/70 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('subtotal', language)}</span>
                  <div className="text-right">
                    <span>{formatPriceRub(subtotalRub)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({formatPriceUsd(subtotalUsd)})</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {language === 'ru'
                      ? `Комиссия (${feeInfo.commissionPercent}%)`
                      : language === 'zh'
                        ? `手续费 (${feeInfo.commissionPercent}%)`
                        : `Platform Fee (${feeInfo.commissionPercent}%)`}
                  </span>
                  <div className="text-right">
                    <span>{formatPriceRub(platformFeeRub)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({formatPriceUsd(platformFeeUsd)})</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>{t('total', language)}</span>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{formatPriceRub(totalRub)}</p>
                    <p className="text-xs text-muted-foreground">{formatPriceUsd(totalUsd)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground space-y-1.5">
                <p className="font-medium text-foreground">
                  {language === 'ru' ? 'Покупка защищена' : language === 'zh' ? '安全保障' : 'Protected purchase'}
                </p>
                <p>{language === 'ru' ? '• Автоматическая выдача после оплаты' : language === 'zh' ? '• 支付后自动交付' : '• Instant auto-delivery after payment'}</p>
                <p>{language === 'ru' ? '• Доступ к данным в разделе заказов' : language === 'zh' ? '• 在订单页查看全部数据' : '• Full data available in Orders section'}</p>
              </div>

              <SheetFooter className="flex-col gap-2 sm:flex-col">
                <Button 
                  className="w-full" 
                  onClick={handleCheckout}
                >
                  <Icons.ArrowRight className="mr-2 h-4 w-4" />
                  {t('proceedToCheckout', language)}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={clearCart}
                >
                  <Icons.Trash2 className="mr-2 h-4 w-4" />
                  {t('clearCart', language)}
                </Button>
              </SheetFooter>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
