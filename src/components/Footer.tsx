import { useAppStore } from '@/store/appStore';
import { Icons } from './Icons';

export function Footer() {
  const { language, setCurrentView } = useAppStore();

  const getText = (en: string, ru: string, zh: string) => {
    if (language === 'ru') return ru;
    if (language === 'zh') return zh;
    return en;
  };

  return (
    <footer className="border-t border-border bg-muted/30 py-8">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Icons.Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold">hsello.com</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {getText(
                'The premier marketplace for digital goods. Buy and sell verified accounts securely.',
                'Ведущий маркетплейс цифровых товаров. Покупайте и продавайте verified аккаунты безопасно.',
                '数字商品的首要市场。安全地买卖验证账户。'
              )}
            </p>
          </div>

          {/* Buyers */}
          <div>
            <h4 className="font-semibold mb-4">
              {getText('For Buyers', 'Для покупателей', '买家')}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button onClick={() => setCurrentView('MARKETPLACE')} className="hover:text-foreground transition-colors">
                  {getText('Browse Products', 'Просмотр товаров', '浏览产品')}
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('ORDERS')} className="hover:text-foreground transition-colors">
                  {getText('My Orders', 'Мои заказы', '我的订单')}
                </button>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {getText('Payment Methods', 'Способы оплаты', '支付方式')}
                </span>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {getText('Support', 'Поддержка', '支持')}
                </span>
              </li>
            </ul>
          </div>

          {/* Sellers */}
          <div>
            <h4 className="font-semibold mb-4">
              {getText('For Sellers', 'Для продавцов', '卖家')}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button onClick={() => setCurrentView('SELLER_DASHBOARD')} className="hover:text-foreground transition-colors">
                  {getText('Seller Dashboard', 'Панель продавца', '卖家面板')}
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('SELLER_UPLOAD')} className="hover:text-foreground transition-colors">
                  {getText('Bulk Upload', 'Массовая загрузка', '批量上传')}
                </button>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {getText('API Documentation', 'API документация', 'API文档')}
                </span>
              </li>
              <li>
                <button onClick={() => setCurrentView('SELLER_WITHDRAW')} className="hover:text-foreground transition-colors">
                  {getText('Withdraw Funds', 'Вывод средств', '提款')}
                </button>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">
              {getText('Support', 'Поддержка', '支持')}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {getText('Help Center', 'Центр помощи', '帮助中心')}
                </span>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {getText('Terms of Service', 'Условия использования', '服务条款')}
                </span>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {getText('Privacy Policy', 'Политика конфиденциальности', '隐私政策')}
                </span>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">
                  {getText('Contact Us', 'Связаться с нами', '联系我们')}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 hsello.com. {getText('All rights reserved.', 'Все права защищены.', '版权所有。')}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground hover:text-foreground cursor-pointer">
              <Icons.Twitter className="h-5 w-5" />
            </span>
            <span className="text-muted-foreground hover:text-foreground cursor-pointer">
              <Icons.MessageCircle className="h-5 w-5" />
            </span>
            <span className="text-muted-foreground hover:text-foreground cursor-pointer">
              <Icons.Globe className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
