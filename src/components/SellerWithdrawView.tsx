import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Badge not used
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { formatPriceRub } from '@/lib/i18n';
import { 
  ArrowLeft, 
  Bitcoin, 
  TrendingDown, 
  CheckCircle, 
  Loader2,
  Wallet,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import type { CryptoType } from '@/types';

const CRYPTO_RATES: Record<CryptoType, number> = {
  BTC: 65000,
  ETH: 3500,
  USDT: 1,
  TRX: 0.11,
};

export function SellerWithdrawView() {
  const { 
    currentUser, 
    language, 
    setCurrentView,
    withdrawCrypto
  } = useAppStore();

  const [cryptoType, setCryptoType] = useState<CryptoType>('USDT');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [step, setStep] = useState<'amount' | 'confirm' | 'success'>('amount');
  const [isProcessing, setIsProcessing] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const usdValue = amountNum;
  const rubValue = Math.round(usdValue * 92);
  const commission = rubValue * 0.1;
  const netAmountRub = rubValue - commission;
  const netAmountUsd = usdValue * 0.9;
  const cryptoAmount = netAmountUsd / CRYPTO_RATES[cryptoType];

  const minWithdrawal = 500;
  const hasEnoughBalance = currentUser && currentUser.balanceRub >= rubValue && rubValue >= minWithdrawal;

  const handleContinue = () => {
    if (amountNum <= 0) {
      toast.error(language === 'ru' ? 'Введите сумму' : language === 'zh' ? '输入金额' : 'Enter amount');
      return;
    }
    if (rubValue < minWithdrawal) {
      toast.error(language === 'ru' ? `Минимум ${minWithdrawal} RUB` : language === 'zh' ? `最低 ${minWithdrawal} RUB` : `Minimum ${minWithdrawal} RUB`);
      return;
    }
    if (!hasEnoughBalance) {
      toast.error(language === 'ru' ? 'Недостаточно средств' : language === 'zh' ? '余额不足' : 'Insufficient balance');
      return;
    }
    setStep('confirm');
  };

  const handleWithdraw = async () => {
    if (!address.trim()) {
      toast.error(language === 'ru' ? 'Введите адрес' : language === 'zh' ? '输入地址' : 'Enter address');
      return;
    }

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const result = withdrawCrypto(cryptoType, cryptoAmount, address);
    
    if (result.success) {
      setStep('success');
      toast.success(language === 'ru' ? 'Вывод выполнен!' : language === 'zh' ? '提现成功!' : 'Withdrawal successful!');
    } else {
      toast.error(result.error || (language === 'ru' ? 'Ошибка' : language === 'zh' ? '错误' : 'Error'));
    }
    setIsProcessing(false);
  };

  if (!currentUser || currentUser.role !== 'SELLER') {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>{language === 'ru' ? 'Доступ запрещен' : language === 'zh' ? '访问被拒绝' : 'Access Denied'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCurrentView('MARKETPLACE')}>
              {language === 'ru' ? 'На маркетплейс' : language === 'zh' ? '去市场' : 'To Marketplace'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-4 md:py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setCurrentView('SELLER_DASHBOARD')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {language === 'ru' ? 'Вывод средств' : language === 'zh' ? '提现' : 'Withdraw Funds'}
          </h1>
        </div>

        {/* Step 1: Amount Selection */}
        {step === 'amount' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                {language === 'ru' ? 'Сумма вывода' : language === 'zh' ? '提现金额' : 'Withdrawal Amount'}
              </CardTitle>
              <CardDescription>
                {language === 'ru' ? `Минимум ${minWithdrawal} RUB. Комиссия 10%.` : language === 'zh' ? `最低 ${minWithdrawal} RUB。手续费 10%。` : `Minimum ${minWithdrawal} RUB. 10% fee.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Balance Display */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-primary" />
                    <span className="text-muted-foreground">{language === 'ru' ? 'Доступно' : language === 'zh' ? '可用' : 'Available'}</span>
                  </div>
                  <span className="font-bold">{formatPriceRub(currentUser.balanceRub, language)}</span>
                </div>
              </div>

              {/* Crypto Type Selection */}
              <div>
                <Label className="mb-3 block">
                  {language === 'ru' ? 'Криптовалюта' : language === 'zh' ? '加密货币' : 'Cryptocurrency'}
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['BTC', 'ETH', 'USDT', 'TRX'] as CryptoType[]).map((type) => (
                    <Button
                      key={type}
                      variant={cryptoType === type ? 'default' : 'outline'}
                      onClick={() => setCryptoType(type)}
                      className="w-full"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <Label className="mb-2 block">
                  {language === 'ru' ? 'Сумма (USD)' : language === 'zh' ? '金额 (USD)' : 'Amount (USD)'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg"
                />
              </div>

              {/* Conversion Preview */}
              {amountNum > 0 && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Сумма' : language === 'zh' ? '金额' : 'Amount'}</span>
                    <span className="font-medium">{formatPriceRub(rubValue, language)}</span>
                  </div>
                  <div className="flex justify-between text-red-500">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Комиссия (10%)' : language === 'zh' ? '手续费 (10%)' : 'Fee (10%)'}</span>
                    <span>-{formatPriceRub(commission, language)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">{language === 'ru' ? 'К получению' : language === 'zh' ? '实际到账' : 'You Receive'}</span>
                    <div className="text-right">
                      <p className="font-bold text-green-500">{cryptoAmount.toFixed(6)} {cryptoType}</p>
                      <p className="text-sm text-muted-foreground">≈ {formatPriceRub(netAmountRub, language)}</p>
                    </div>
                  </div>
                </div>
              )}

              {rubValue > 0 && rubValue < minWithdrawal && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">
                    {language === 'ru' 
                      ? `Минимальная сумма вывода: ${minWithdrawal} RUB` 
                      : language === 'zh' 
                        ? `最低提现金额：${minWithdrawal} RUB`
                        : `Minimum withdrawal: ${minWithdrawal} RUB`}
                  </p>
                </div>
              )}

              {rubValue >= minWithdrawal && !hasEnoughBalance && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">
                    {language === 'ru' ? 'Недостаточно средств на балансе' : language === 'zh' ? '余额不足' : 'Insufficient balance'}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg"
                disabled={amountNum <= 0 || rubValue < minWithdrawal || !hasEnoughBalance}
                onClick={handleContinue}
              >
                {language === 'ru' ? 'Продолжить' : language === 'zh' ? '继续' : 'Continue'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Confirm & Address */}
        {step === 'confirm' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bitcoin className="w-5 h-5" />
                {language === 'ru' ? 'Подтверждение' : language === 'zh' ? '确认' : 'Confirmation'}
              </CardTitle>
              <CardDescription>
                {language === 'ru' ? 'Введите адрес кошелька' : language === 'zh' ? '输入钱包地址' : 'Enter wallet address'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Сумма' : language === 'zh' ? '金额' : 'Amount'}</span>
                  <span>{formatPriceRub(rubValue, language)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Комиссия' : language === 'zh' ? '手续费' : 'Fee'}</span>
                  <span className="text-red-500">-{formatPriceRub(commission, language)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">{language === 'ru' ? 'К получению' : language === 'zh' ? '实际到账' : 'You Receive'}</span>
                  <span className="font-bold text-green-500">{cryptoAmount.toFixed(6)} {cryptoType}</span>
                </div>
              </div>

              {/* Address Input */}
              <div>
                <Label className="mb-2 block">
                  {language === 'ru' ? `Адрес ${cryptoType}` : language === 'zh' ? `${cryptoType} 地址` : `${cryptoType} Address`}
                </Label>
                <Input
                  placeholder={language === 'ru' ? 'Введите адрес...' : language === 'zh' ? '输入地址...' : 'Enter address...'}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <p className="text-sm text-yellow-700">
                  {language === 'ru' 
                    ? 'Убедитесь что адрес верный. Транзакции необратимы.' 
                    : language === 'zh' 
                      ? '请确保地址正确。交易不可逆。'
                      : 'Make sure the address is correct. Transactions are irreversible.'}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setStep('amount')}
              >
                {language === 'ru' ? 'Назад' : language === 'zh' ? '返回' : 'Back'}
              </Button>
              <Button 
                className="flex-1"
                onClick={handleWithdraw}
                disabled={isProcessing || !address.trim()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'ru' ? 'Обработка...' : language === 'zh' ? '处理中...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 mr-2" />
                    {language === 'ru' ? 'Вывести' : language === 'zh' ? '提现' : 'Withdraw'}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">
                {language === 'ru' ? 'Вывод выполнен!' : language === 'zh' ? '提现成功!' : 'Withdrawal Successful!'}
              </CardTitle>
              <CardDescription>
                {language === 'ru' 
                  ? 'Средства отправлены на указанный адрес' 
                  : language === 'zh' 
                    ? '资金已发送到指定地址'
                    : 'Funds have been sent to the specified address'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  {language === 'ru' ? 'Отправлено' : language === 'zh' ? '已发送' : 'Sent'}
                </p>
                <p className="text-2xl font-bold text-green-500">{cryptoAmount.toFixed(6)} {cryptoType}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ {formatPriceRub(netAmountRub, language)}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  {language === 'ru' ? 'Адрес' : language === 'zh' ? '地址' : 'Address'}
                </p>
                <code className="text-sm font-mono break-all">{address}</code>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3 justify-center">
              <Button onClick={() => setCurrentView('SELLER_DASHBOARD')}>
                {language === 'ru' ? 'В панель' : language === 'zh' ? '返回面板' : 'To Dashboard'}
              </Button>
              <Button variant="outline" onClick={() => { setStep('amount'); setAmount(''); setAddress(''); }}>
                {language === 'ru' ? 'Новый вывод' : language === 'zh' ? '新提现' : 'New Withdrawal'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
