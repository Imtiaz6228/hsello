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
  Copy, 
  CheckCircle, 
  Loader2,
  Wallet,
  AlertCircle
} from 'lucide-react';
import type { CryptoType } from '@/types';

const CRYPTO_RATES: Record<CryptoType, number> = {
  BTC: 65000,
  ETH: 3500,
  USDT: 1,
  TRX: 0.11,
};

const CRYPTO_ADDRESSES: Record<CryptoType, string> = {
  BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  ETH: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  TRX: 'TJRpN3qNf5f5f5f5f5f5f5f5f5f5f5f5f5f',
};

export function DepositView() {
  const { 
    currentUser, 
    language, 
    setCurrentView,
    depositCrypto,
    confirmDeposit
  } = useAppStore();

  const [cryptoType, setCryptoType] = useState<CryptoType>('BTC');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'amount' | 'payment' | 'confirm'>('amount');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [balancePreviewRub, setBalancePreviewRub] = useState<number | null>(null);

  const amountNum = parseFloat(amount) || 0;
  const usdValue = amountNum * CRYPTO_RATES[cryptoType];
  const rubValue = Math.round(usdValue * 92);

  const handleContinue = () => {
    if (amountNum <= 0) {
      toast.error(language === 'ru' ? 'Введите сумму' : language === 'zh' ? '输入金额' : 'Enter amount');
      return;
    }
    if (rubValue < 500) {
      toast.error(language === 'ru' ? 'Минимум 500 RUB' : language === 'zh' ? '最低 500 RUB' : 'Minimum 500 RUB');
      return;
    }

    const tx = depositCrypto(cryptoType, amountNum, CRYPTO_ADDRESSES[cryptoType]);
    setTransactionId(tx.id);
    setBalancePreviewRub((currentUser?.balanceRub ?? 0) + rubValue);
    setStep('payment');
  };

  const handleConfirmPayment = async () => {
    if (!transactionId) return;
    
    setIsConfirming(true);
    // Simulate blockchain confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    confirmDeposit(transactionId);
    setStep('confirm');
    setIsConfirming(false);
    toast.success(language === 'ru' ? 'Баланс пополнен!' : language === 'zh' ? '余额已充值!' : 'Balance deposited!');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(language === 'ru' ? 'Скопировано!' : language === 'zh' ? '已复制!' : 'Copied!');
  };

  if (!currentUser) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>
              {language === 'ru' ? 'Требуется вход' : language === 'zh' ? '需要登录' : 'Login Required'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCurrentView('LOGIN')}>
              {language === 'ru' ? 'Войти' : language === 'zh' ? '登录' : 'Login'}
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
          <Button variant="ghost" size="icon" onClick={() => setCurrentView('ORDERS')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {language === 'ru' ? 'Пополнение баланса' : language === 'zh' ? '充值' : 'Deposit Funds'}
          </h1>
        </div>

        {/* Step 1: Amount Selection */}
        {step === 'amount' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                {language === 'ru' ? 'Выберите сумму' : language === 'zh' ? '选择金额' : 'Select Amount'}
              </CardTitle>
              <CardDescription>
                {language === 'ru' ? 'Минимум 500 RUB / 5 USD' : language === 'zh' ? '最低 500 RUB / 5 USD' : 'Minimum 500 RUB / 5 USD'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  {language === 'ru' ? 'Сумма в' : language === 'zh' ? '金额 (' : 'Amount ('}{cryptoType})
                </Label>
                <Input
                  type="number"
                  step="0.0001"
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
                    <span className="text-muted-foreground">{cryptoType}</span>
                    <span className="font-medium">{amountNum} {cryptoType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">USD</span>
                    <span className="font-medium">${usdValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RUB</span>
                    <span className="font-bold text-primary">{formatPriceRub(rubValue, language)}</span>
                  </div>
                </div>
              )}

              {rubValue > 0 && rubValue < 500 && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">
                    {language === 'ru' 
                      ? 'Минимальная сумма пополнения: 500 RUB' 
                      : language === 'zh' 
                        ? '最低充值金额：500 RUB'
                        : 'Minimum deposit amount: 500 RUB'}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg"
                disabled={amountNum <= 0 || rubValue < 500}
                onClick={handleContinue}
              >
                {language === 'ru' ? 'Продолжить' : language === 'zh' ? '继续' : 'Continue'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Payment */}
        {step === 'payment' && transactionId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bitcoin className="w-5 h-5" />
                {language === 'ru' ? 'Оплата' : language === 'zh' ? '支付' : 'Payment'}
              </CardTitle>
              <CardDescription>
                {language === 'ru' 
                  ? 'Отправьте указанную сумму на адрес ниже' 
                  : language === 'zh' 
                    ? '将指定金额发送到以下地址'
                    : 'Send the specified amount to the address below'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount to Send */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {language === 'ru' ? 'Отправьте' : language === 'zh' ? '发送' : 'Send'}
                </p>
                <p className="text-3xl font-bold">{amountNum} {cryptoType}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ {formatPriceRub(rubValue, language)}
                </p>
              </div>

              {/* Address */}
              <div>
                <Label className="mb-2 block">
                  {language === 'ru' ? 'Адрес' : language === 'zh' ? '地址' : 'Address'}
                </Label>
                <div className="flex gap-2">
                  <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono break-all">
                    {CRYPTO_ADDRESSES[cryptoType]}
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(CRYPTO_ADDRESSES[cryptoType])}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Network Warning */}
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <p className="text-sm text-yellow-700">
                  {language === 'ru' 
                    ? 'Отправляйте только ' + cryptoType + '. Отправка других токенов может привести к потере средств.' 
                    : language === 'zh' 
                      ? '仅发送 ' + cryptoType + '。发送其他代币可能导致资金损失。'
                      : 'Send only ' + cryptoType + '. Sending other tokens may result in loss of funds.'}
                </p>
              </div>

              <Separator />

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  {language === 'ru' 
                    ? 'После отправки средств нажмите кнопку ниже' 
                    : language === 'zh' 
                      ? '发送资金后点击下方按钮'
                      : 'After sending funds, click the button below'}
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
                onClick={handleConfirmPayment}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'ru' ? 'Подтверждение...' : language === 'zh' ? '确认中...' : 'Confirming...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {language === 'ru' ? 'Я оплатил' : language === 'zh' ? '我已支付' : 'I have paid'}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirm' && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">
                {language === 'ru' ? 'Успешно!' : language === 'zh' ? '成功!' : 'Success!'}
              </CardTitle>
              <CardDescription>
                {language === 'ru' 
                  ? 'Ваш баланс успешно пополнен' 
                  : language === 'zh' 
                    ? '您的余额已成功充值'
                    : 'Your balance has been successfully deposited'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  {language === 'ru' ? 'Пополнено' : language === 'zh' ? '已充值' : 'Deposited'}
                </p>
                <p className="text-2xl font-bold text-green-500">+{formatPriceRub(rubValue, language)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  {language === 'ru' ? 'Новый баланс' : language === 'zh' ? '新余额' : 'New Balance'}
                </p>
                <p className="text-xl font-bold">{formatPriceRub(balancePreviewRub ?? currentUser.balanceRub, language)}</p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3 justify-center">
              <Button onClick={() => setCurrentView('ORDERS')}>
                {language === 'ru' ? 'Мой аккаунт' : language === 'zh' ? '我的账户' : 'My Account'}
              </Button>
              <Button variant="outline" onClick={() => setCurrentView('MARKETPLACE')}>
                {language === 'ru' ? 'На маркетплейс' : language === 'zh' ? '去市场' : 'To Marketplace'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
