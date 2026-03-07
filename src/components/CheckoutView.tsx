import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { db } from '@/store/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
// Input component not used in this view
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatPriceRub, formatPriceUsd, t } from '@/lib/i18n';
import { 
  ShoppingCart, 
  Wallet, 
  Bitcoin, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  CreditCard,
  Loader2
} from 'lucide-react';
import { calculatePlatformFee } from '@/lib/platform';
import type { CryptoType } from '@/types';

export function CheckoutView() {
  const { 
    cart, 
    currentUser, 
    language, 
    getCartTotalRub, 
    getCartTotalUsd, 
    clearCart, 
    setCurrentView,
    refreshOrders
  } = useAppStore();

  const [paymentMethod, setPaymentMethod] = useState<'BALANCE' | 'CRYPTO'>('BALANCE');
  const [cryptoType, setCryptoType] = useState<CryptoType>('BTC');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  const cartTotalRub = getCartTotalRub();
  const cartTotalUsd = getCartTotalUsd();
  const feeInfo = calculatePlatformFee(cartTotalRub, cartTotalUsd);
  const platformFeeRub = feeInfo.feeRub;
  const platformFeeUsd = feeInfo.feeUsd;
  const totalWithFeeRub = cartTotalRub + platformFeeRub;
  const totalWithFeeUsd = cartTotalUsd + platformFeeUsd;
  const cartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  const hasEnoughBalance = currentUser && currentUser.balanceRub >= totalWithFeeRub;

  const handlePlaceOrder = async () => {
    if (!currentUser) {
      toast.error(t('loginRequired', language));
      setCurrentView('LOGIN');
      return;
    }

    if (cart.length === 0) {
      toast.error(t('cartEmpty', language));
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (paymentMethod === 'BALANCE' && !hasEnoughBalance) {
        toast.error(t('insufficientBalance', language));
        setIsProcessing(false);
        return;
      }

      // Create order
      const order = db.createOrder({
        buyerId: currentUser.id,
        buyerEmail: currentUser.email,
        totalPriceRub: cartTotalRub,
        totalPriceUsd: cartTotalUsd,
        platformFeeRub: platformFeeRub,
        platformFeeUsd: platformFeeUsd,
        paymentStatus: 'CONFIRMED',
        paymentMethod: paymentMethod,
        cryptoType: paymentMethod === 'CRYPTO' ? cryptoType : undefined,
      });

      // Create order items and mark stock as sold
      for (const cartItem of cart) {
        const product = db.getProductById(cartItem.productId);
        if (!product) continue;

        const bulkPrice = product.bulkPrices.find(
          bp => cartItem.quantity >= bp.minQty && cartItem.quantity <= bp.maxQty
        );
        const priceRub = bulkPrice ? bulkPrice.priceRub : product.priceRub;
        const priceUsd = bulkPrice ? bulkPrice.priceUsd : product.priceUsd;

        db.createOrderItem({
          orderId: order.id,
          productId: cartItem.productId,
          quantity: cartItem.quantity,
          priceRub,
          priceUsd,
        });

        // Mark stock as sold
        const reservedStock = Array.from(db.stockItems.values())
          .filter(s => s.productId === cartItem.productId && s.isReserved && !s.isSold)
          .slice(0, cartItem.quantity)
          .map(s => s.id);
        
        db.markStockAsSold(reservedStock, order.id);
      }

      // Deduct balance if using balance payment
      if (paymentMethod === 'BALANCE') {
        db.updateUser(currentUser.id, {
          balanceRub: currentUser.balanceRub - totalWithFeeRub,
          balanceUsd: currentUser.balanceUsd - totalWithFeeUsd,
        });
      }

      // Add commission to admin
      const admin = Array.from(db.users.values()).find(u => u.role === 'ADMIN');
      if (admin) {
        db.updateUser(admin.id, {
          balanceRub: admin.balanceRub + platformFeeRub,
          balanceUsd: admin.balanceUsd + platformFeeUsd,
        });
      }

      // Clear cart
      clearCart();
      refreshOrders();

      setCompletedOrderId(order.id);
      setOrderComplete(true);
      toast.success(t('orderPlacedSuccess', language));
    } catch (error) {
      toast.error(t('orderError', language));
    } finally {
      setIsProcessing(false);
    }
  };

  if (orderComplete && completedOrderId) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'ru' ? 'Заказ размещен!' : language === 'zh' ? '订单已下达!' : 'Order Placed!'}
            </CardTitle>
            <CardDescription>
              {language === 'ru' 
                ? `Ваш заказ #${completedOrderId.slice(0, 8)} успешно размещен` 
                : language === 'zh' 
                  ? `您的订单 #${completedOrderId.slice(0, 8)} 已成功下达`
                  : `Your order #${completedOrderId.slice(0, 8)} has been placed successfully`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'ru' ? 'Детали заказа' : language === 'zh' ? '订单详情' : 'Order Details'}
              </p>
              <div className="flex justify-between items-center">
                <span>{language === 'ru' ? 'Всего' : language === 'zh' ? '总计' : 'Total'}</span>
                <span className="font-bold">{formatPriceRub(totalWithFeeRub, language)} / {formatPriceUsd(totalWithFeeUsd, language)}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {language === 'ru' 
                ? 'Аккаунты будут доступны в разделе "Мои заказы"' 
                : language === 'zh' 
                  ? '账户将在"我的订单"中可用'
                  : 'Accounts will be available in My Orders section'}
            </p>
          </CardContent>
          <CardFooter className="flex gap-3 justify-center">
            <Button onClick={() => setCurrentView('ORDERS')}>
              {language === 'ru' ? 'Мои заказы' : language === 'zh' ? '我的订单' : 'My Orders'}
            </Button>
            <Button variant="outline" onClick={() => setCurrentView('MARKETPLACE')}>
              {language === 'ru' ? 'Продолжить покупки' : language === 'zh' ? '继续购物' : 'Continue Shopping'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle>
              {language === 'ru' ? 'Корзина пуста' : language === 'zh' ? '购物车为空' : 'Cart is Empty'}
            </CardTitle>
            <CardDescription>
              {language === 'ru' ? 'Добавьте товары в корзину' : language === 'zh' ? '将商品添加到购物车' : 'Add items to your cart'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => setCurrentView('MARKETPLACE')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Вернуться к покупкам' : language === 'zh' ? '返回购物' : 'Back to Shopping'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-4 md:py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 rounded-2xl border border-border/70 bg-card/75 p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentView('MARKETPLACE')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {language === 'ru' ? 'Оформление заказа' : language === 'zh' ? '结账' : 'Checkout'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {language === 'ru'
                  ? 'Проверьте детали и завершите оплату безопасно'
                  : language === 'zh'
                    ? '确认订单详情并安全完成支付'
                    : 'Review details and complete payment securely'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-border/70 bg-background/60 p-2.5">
              <p className="text-[11px] text-muted-foreground">{language === 'ru' ? 'Позиции' : language === 'zh' ? '项目数' : 'Items'}</p>
              <p className="font-semibold">{cartUnits}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/60 p-2.5">
              <p className="text-[11px] text-muted-foreground">{language === 'ru' ? 'Подытог' : language === 'zh' ? '小计' : 'Subtotal'}</p>
              <p className="font-semibold">{formatPriceRub(cartTotalRub, language)}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/60 p-2.5">
              <p className="text-[11px] text-muted-foreground">{language === 'ru' ? 'Комиссия' : language === 'zh' ? '手续费' : 'Fee'}</p>
              <p className="font-semibold">{formatPriceRub(platformFeeRub, language)}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/60 p-2.5">
              <p className="text-[11px] text-muted-foreground">{language === 'ru' ? 'К оплате' : language === 'zh' ? '应付' : 'Due'}</p>
              <p className="font-semibold text-primary">{formatPriceRub(totalWithFeeRub, language)}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Order Summary & Payment */}
          <div className="md:col-span-2 space-y-6">
            {/* Order Items */}
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  {language === 'ru' ? 'Товары в заказе' : language === 'zh' ? '订单商品' : 'Order Items'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.map((item) => {
                  const product = db.getProductById(item.productId);
                  if (!product) return null;

                  const bulkPrice = product.bulkPrices.find(
                    bp => item.quantity >= bp.minQty && item.quantity <= bp.maxQty
                  );
                  const priceRub = bulkPrice ? bulkPrice.priceRub : product.priceRub;
                  const priceUsd = bulkPrice ? bulkPrice.priceUsd : product.priceUsd;

                  return (
                    <div key={item.productId} className="flex items-start justify-between border-b border-border/60 py-3 last:border-0">
                      <div>
                        <p className="font-medium">{language === 'ru' ? product.titleRu : product.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ru' ? 'Продавец' : language === 'zh' ? '卖家' : 'Seller'}: {product.seller?.supplierId || 'N/A'}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          {language === 'ru' ? 'Количество' : language === 'zh' ? '数量' : 'Qty'}: {item.quantity}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPriceRub(priceRub * item.quantity, language)}</p>
                        <p className="text-sm text-muted-foreground">{formatPriceUsd(priceUsd * item.quantity, language)}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {language === 'ru' ? 'Способ оплаты' : language === 'zh' ? '支付方式' : 'Payment Method'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={paymentMethod} 
                  onValueChange={(v) => setPaymentMethod(v as 'BALANCE' | 'CRYPTO')}
                  className="space-y-3"
                >
                  <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'BALANCE' ? 'border-primary bg-primary/5' : ''}`}>
                    <RadioGroupItem value="BALANCE" id="balance" />
                    <Label htmlFor="balance" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Wallet className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">
                            {language === 'ru' ? 'Баланс аккаунта' : language === 'zh' ? '账户余额' : 'Account Balance'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {currentUser ? formatPriceRub(currentUser.balanceRub, language) : '---'}
                          </p>
                        </div>
                      </div>
                    </Label>
                    {!hasEnoughBalance && paymentMethod === 'BALANCE' && (
                      <Badge variant="destructive">
                        {language === 'ru' ? 'Недостаточно' : language === 'zh' ? '余额不足' : 'Insufficient'}
                      </Badge>
                    )}
                  </div>

                  <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'CRYPTO' ? 'border-primary bg-primary/5' : ''}`}>
                    <RadioGroupItem value="CRYPTO" id="crypto" />
                    <Label htmlFor="crypto" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Bitcoin className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="font-medium">
                            {language === 'ru' ? 'Криптовалюта' : language === 'zh' ? '加密货币' : 'Cryptocurrency'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            BTC, ETH, USDT, TRX
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                {paymentMethod === 'CRYPTO' && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <Label className="mb-2 block">
                      {language === 'ru' ? 'Выберите криптовалюту' : language === 'zh' ? '选择加密货币' : 'Select Cryptocurrency'}
                    </Label>
                    <div className="flex gap-2 flex-wrap">
                      {(['BTC', 'ETH', 'USDT', 'TRX'] as CryptoType[]).map((type) => (
                        <Button
                          key={type}
                          variant={cryptoType === type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCryptoType(type)}
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Total */}
          <div>
            <Card className="sticky top-4 border-border/70 bg-card/85">
              <CardHeader>
                <CardTitle className="text-lg">
                  {language === 'ru' ? 'Итого' : language === 'zh' ? '总计' : 'Order Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 rounded-lg border border-border/70 bg-background/60 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {language === 'ru' ? 'Подытог' : language === 'zh' ? '小计' : 'Subtotal'}
                    </span>
                    <span>{formatPriceRub(cartTotalRub, language)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {language === 'ru'
                        ? `Комиссия (${feeInfo.commissionPercent}%)`
                        : language === 'zh'
                          ? `手续费 (${feeInfo.commissionPercent}%)`
                          : `Platform Fee (${feeInfo.commissionPercent}%)`}
                    </span>
                    <span>{formatPriceRub(platformFeeRub, language)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {language === 'ru' ? 'Всего к оплате' : language === 'zh' ? '应付总额' : 'Total'}
                  </span>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{formatPriceRub(totalWithFeeRub, language)}</p>
                    <p className="text-sm text-muted-foreground">{formatPriceUsd(totalWithFeeUsd, language)}</p>
                  </div>
                </div>

                <div className="space-y-1.5 rounded-lg border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {language === 'ru' ? 'Гарантии оплаты' : language === 'zh' ? '支付保障' : 'Payment assurances'}
                  </p>
                  <p>{language === 'ru' ? '• Мгновенная выдача после подтверждения' : language === 'zh' ? '• 确认后即时交付' : '• Instant delivery after confirmation'}</p>
                  <p>{language === 'ru' ? '• Поддержка и споры 24/7' : language === 'zh' ? '• 7x24 客服与争议处理' : '• 24/7 support and dispute handling'}</p>
                  <p>{language === 'ru' ? '• История заказа доступна в профиле' : language === 'zh' ? '• 订单历史可在个人中心查看' : '• Order history available in your account'}</p>
                </div>

                {paymentMethod === 'BALANCE' && !hasEnoughBalance && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                    <p className="text-sm text-destructive">
                      {language === 'ru' 
                        ? 'Недостаточно средств на балансе. Пополните баланс или выберите другой способ оплаты.' 
                        : language === 'zh' 
                          ? '余额不足。请充值或选择其他支付方式。'
                          : 'Insufficient balance. Please deposit or choose another payment method.'}
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={isProcessing || (paymentMethod === 'BALANCE' && !hasEnoughBalance)}
                  onClick={handlePlaceOrder}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {language === 'ru' ? 'Обработка...' : language === 'zh' ? '处理中...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {language === 'ru' ? 'Разместить заказ' : language === 'zh' ? '下达订单' : 'Place Order'}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
