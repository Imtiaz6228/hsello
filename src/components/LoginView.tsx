import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Icons } from './Icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { t } from '@/lib/i18n';
import type { UserRole } from '@/types';

export function LoginView() {
  const { login, register, setCurrentView, language, currentView, authPreferredRole, setAuthPreferredRole } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const defaultTab = currentView === 'REGISTER' ? 'register' : 'login';

  const getAuthErrorMessage = (errorMessage?: string) => {
    if (!errorMessage) return 'Login failed';

    if (errorMessage === 'Seller account is pending admin approval') {
      return language === 'ru'
        ? 'Аккаунт продавца ожидает одобрения администратора.'
        : language === 'zh'
          ? '卖家账号正在等待管理员审核。'
          : 'Seller account is pending admin approval.';
    }

    if (errorMessage === 'Seller account was rejected by admin') {
      return language === 'ru'
        ? 'Аккаунт продавца был отклонен администратором.'
        : language === 'zh'
          ? '卖家账号已被管理员拒绝。'
          : 'Seller account was rejected by admin.';
    }

    return errorMessage;
  };

  const goAfterAuth = (role?: UserRole) => {
    const user = useAppStore.getState().currentUser;
    if (role === 'SELLER') {
      if (user?.sellerModerationStatus === 'PENDING') {
        setCurrentView('MARKETPLACE');
        setError(
          language === 'ru'
            ? 'Аккаунт продавца на модерации. Дождитесь решения администратора.'
            : language === 'zh'
              ? '卖家账号正在审核中，请等待管理员处理。'
              : 'Seller account is in moderation. Please wait for admin approval.'
        );
        return;
      }
      if (user?.sellerModerationStatus === 'REJECTED') {
        setCurrentView('MARKETPLACE');
        setError(
          language === 'ru'
            ? 'Аккаунт продавца отклонен администратором.'
            : language === 'zh'
              ? '卖家账号已被管理员拒绝。'
              : 'Seller account was rejected by admin.'
        );
        return;
      }
      setCurrentView('SELLER_DASHBOARD');
      return;
    }
    if (role === 'ADMIN') {
      setCurrentView('ADMIN_DASHBOARD');
      return;
    }
    setCurrentView('MARKETPLACE');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = login(email, password);
    if (result.success) {
      setEmail('');
      setPassword('');
      goAfterAuth(result.user?.role);
    } else {
      setError(getAuthErrorMessage(result.error));
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const registerRole: UserRole = authPreferredRole === 'SELLER' ? 'SELLER' : 'BUYER';

    if (registerPassword.length < 6) {
      setError(language === 'ru' ? 'Минимум 6 символов' : language === 'zh' ? '密码至少6位' : 'Password must be at least 6 characters');
      return;
    }

    if (registerPassword !== confirmPassword) {
      setError(language === 'ru' ? 'Пароли не совпадают' : language === 'zh' ? '两次输入的密码不一致' : 'Passwords do not match');
      return;
    }

    if (registerRole === 'SELLER') {
      if (!storeName.trim()) {
        setError(language === 'ru' ? 'Укажите название магазина' : language === 'zh' ? '请填写店铺名称' : 'Store name is required');
        return;
      }
      if (!storeDescription.trim()) {
        setError(language === 'ru' ? 'Укажите описание магазина' : language === 'zh' ? '请填写店铺描述' : 'Store description is required');
        return;
      }
    }

    const result = register(
      registerEmail,
      registerPassword,
      registerRole,
      registerRole === 'SELLER' ? storeName.trim() : undefined,
      registerRole === 'SELLER' ? storeDescription.trim() : undefined
    );
    if (result.success) {
      if (registerRole === 'SELLER') {
        setRegisterEmail('');
        setRegisterPassword('');
        setConfirmPassword('');
        setStoreName('');
        setStoreDescription('');
        setCurrentView('LOGIN');
        setAuthPreferredRole('SELLER');
        setError(
          language === 'ru'
            ? 'Аккаунт продавца зарегистрирован и ожидает одобрения администратора.'
            : language === 'zh'
              ? '卖家账号已注册，正在等待管理员审核。'
              : 'Seller account registered and is pending admin approval.'
        );
        return;
      }

      setRegisterEmail('');
      setRegisterPassword('');
      setConfirmPassword('');
      setStoreName('');
      setStoreDescription('');
      goAfterAuth(result.user?.role);
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  const demoAccounts = [
    { role: 'BUYER', email: 'buyer@demo.com', password: 'buyer123', label: 'Demo Buyer', labelRu: 'Демо покупатель', labelZh: '演示买家' },
    { role: 'SELLER', email: 'seller1@demo.com', password: 'seller123', label: 'Demo Seller', labelRu: 'Демо продавец', labelZh: '演示卖家' },
    { role: 'ADMIN', email: 'admin@hsello.com', password: 'admin123', label: 'Demo Admin', labelRu: 'Демо админ', labelZh: '演示管理员' },
  ];

  const getLabel = (account: typeof demoAccounts[0]) => {
    if (language === 'ru') return account.labelRu;
    if (language === 'zh') return account.labelZh;
    return account.label;
  };

  const handleDemoLogin = (emailValue: string, passwordValue: string) => {
    setError(null);
    const result = login(emailValue, passwordValue);
    if (result.success) {
      goAfterAuth(result.user?.role);
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <div className="container max-w-md py-8 md:py-16">
      <Button 
        variant="ghost" 
        className="mb-4 -ml-4"
        onClick={() => setCurrentView('MARKETPLACE')}
      >
        <Icons.ArrowLeft className="mr-2 h-4 w-4" />
        {t('back', language)}
      </Button>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="login">{t('login', language)}</TabsTrigger>
          <TabsTrigger value="register">{t('register', language)}</TabsTrigger>
          <TabsTrigger value="demo">{t('demoAccounts', language)}</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>{t('login', language)}</CardTitle>
              <CardDescription>
                {language === 'ru' ? 'Войдите в свой аккаунт' : 
                 language === 'zh' ? '登录到您的账户' : 
                 'Sign in to your account'}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <Icons.AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={authPreferredRole === 'BUYER' ? 'default' : 'outline'}
                    onClick={() => setAuthPreferredRole('BUYER')}
                  >
                    {t('loginAsBuyer', language)}
                  </Button>
                  <Button
                    type="button"
                    variant={authPreferredRole === 'SELLER' ? 'default' : 'outline'}
                    onClick={() => setAuthPreferredRole('SELLER')}
                  >
                    {t('loginAsSeller', language)}
                  </Button>
                  <Button
                    type="button"
                    variant={authPreferredRole === 'ADMIN' ? 'default' : 'outline'}
                    onClick={() => setAuthPreferredRole('ADMIN')}
                  >
                    {t('loginAsAdmin', language)}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email', language)}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password', language)}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                  <Icons.LogIn className="mr-2 h-4 w-4" />
                  {authPreferredRole === 'SELLER'
                    ? t('loginAsSeller', language)
                    : authPreferredRole === 'ADMIN'
                      ? t('loginAsAdmin', language)
                      : t('loginAsBuyer', language)}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>{t('register', language)}</CardTitle>
              <CardDescription>
                {language === 'ru' ? 'Создайте аккаунт покупателя или продавца' :
                 language === 'zh' ? '创建买家或卖家账户' :
                 'Create a buyer or seller account'}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <Icons.AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={authPreferredRole === 'BUYER' ? 'default' : 'outline'}
                    onClick={() => setAuthPreferredRole('BUYER')}
                  >
                    {language === 'ru' ? 'Регистрация покупателя' : language === 'zh' ? '买家注册' : 'Buyer Register'}
                  </Button>
                  <Button
                    type="button"
                    variant={authPreferredRole === 'SELLER' ? 'default' : 'outline'}
                    onClick={() => setAuthPreferredRole('SELLER')}
                  >
                    {language === 'ru' ? 'Регистрация продавца' : language === 'zh' ? '卖家注册' : 'Seller Register'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">{t('email', language)}</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="email@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">{t('password', language)}</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">
                    {language === 'ru' ? 'Подтвердите пароль' : language === 'zh' ? '确认密码' : 'Confirm Password'}
                  </Label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {authPreferredRole === 'SELLER' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="store-name">{language === 'ru' ? 'Название магазина' : language === 'zh' ? '店铺名称' : 'Store Name'}</Label>
                      <Input
                        id="store-name"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder={language === 'ru' ? 'Введите название магазина' : language === 'zh' ? '输入店铺名称' : 'Enter your store name'}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="store-description">{language === 'ru' ? 'Описание магазина' : language === 'zh' ? '店铺描述' : 'Store Description'}</Label>
                      <Textarea
                        id="store-description"
                        value={storeDescription}
                        onChange={(e) => setStoreDescription(e.target.value)}
                        placeholder={language === 'ru' ? 'Опишите ваш магазин' : language === 'zh' ? '描述您的店铺' : 'Describe your store'}
                        required
                      />
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                  <Icons.User className="mr-2 h-4 w-4" />
                  {authPreferredRole === 'SELLER'
                    ? (language === 'ru' ? 'Зарегистрироваться как продавец' : language === 'zh' ? '注册为卖家' : 'Register as Seller')
                    : (language === 'ru' ? 'Зарегистрироваться как покупатель' : language === 'zh' ? '注册为买家' : 'Register as Buyer')}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="demo">
          <Card>
            <CardHeader>
              <CardTitle>{t('demoAccounts', language)}</CardTitle>
              <CardDescription>
                {language === 'ru' ? 'Выберите демо-аккаунт для входа' : 
                 language === 'zh' ? '选择演示账户登录' : 
                 'Select a demo account to login'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => handleDemoLogin(account.email, account.password)}
                  className="w-full p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{getLabel(account)}</p>
                      <p className="text-sm text-muted-foreground">{account.email}</p>
                    </div>
                    <Badge variant="outline">{account.role}</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


