import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { db } from '@/store/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatPriceRub, formatPriceUsd, formatDate } from '@/lib/i18n';
import { 
  Package, 
  Wallet, 
  ArrowLeft, 
  Copy, 
  CheckCircle, 
  Bitcoin,
  TrendingUp,
  TrendingDown,
  Eye,
  MessageSquare
} from 'lucide-react';
import type { Order } from '@/types';
import type { Ticket } from '@/types';

export function OrdersView() {
  const { 
    currentUser, 
    language, 
    setCurrentView,
    orders,
    refreshOrders,
    cryptoTransactions,
    refreshCryptoTransactions
  } = useAppStore();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [appealOrder, setAppealOrder] = useState<Order | null>(null);
  const [showAppealDialog, setShowAppealDialog] = useState(false);
  const [appealMessage, setAppealMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [buyerReply, setBuyerReply] = useState('');
  const [appealAttachments, setAppealAttachments] = useState<string[]>([]);
  const [buyerReplyAttachments, setBuyerReplyAttachments] = useState<string[]>([]);

  useEffect(() => {
    refreshOrders();
    refreshCryptoTransactions();
  }, []);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'CONFIRMED': 'bg-green-500/10 text-green-500 border-green-500/20',
      'PENDING': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'FAILED': 'bg-red-500/10 text-red-500 border-red-500/20',
      'REFUNDED': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };
    const labels: Record<string, string> = {
      'CONFIRMED': language === 'ru' ? 'Подтвержден' : language === 'zh' ? '已确认' : 'Confirmed',
      'PENDING': language === 'ru' ? 'В ожидании' : language === 'zh' ? '待处理' : 'Pending',
      'FAILED': language === 'ru' ? 'Ошибка' : language === 'zh' ? '失败' : 'Failed',
      'REFUNDED': language === 'ru' ? 'Возвращен' : language === 'zh' ? '已退款' : 'Refunded',
    };
    return (
      <Badge variant="outline" className={styles[status] || ''}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getTxTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      'DEPOSIT': 'bg-green-500/10 text-green-500 border-green-500/20',
      'WITHDRAWAL': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    };
    const labels: Record<string, string> = {
      'DEPOSIT': language === 'ru' ? 'Пополнение' : language === 'zh' ? '充值' : 'Deposit',
      'WITHDRAWAL': language === 'ru' ? 'Вывод' : language === 'zh' ? '提现' : 'Withdrawal',
    };
    return (
      <Badge variant="outline" className={styles[type] || ''}>
        {labels[type] || type}
      </Badge>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(language === 'ru' ? 'Скопировано!' : language === 'zh' ? '已复制!' : 'Copied!');
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleOpenAppeal = (order: Order) => {
    const existing = db.getTicketsByOrder(order.id).find(
      (t) => t.type === 'DISPUTE' && t.buyerId === currentUser?.id
    );

    if (existing) {
      setSelectedTicket(existing);
      setBuyerReply('');
      setShowTicketDialog(true);
      return;
    }

    setAppealOrder(order);
    setAppealMessage('');
    setAppealAttachments([]);
    setShowAppealDialog(true);
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const encodeAttachment = async (file: File): Promise<string> => {
    const dataUrl = await fileToDataUrl(file);
    return `${file.name}||${dataUrl}`;
  };

  const parseAttachment = (raw: string): { name: string; url: string } => {
    const sep = raw.indexOf('||');
    if (sep === -1) return { name: 'file', url: raw };
    return {
      name: raw.slice(0, sep) || 'file',
      url: raw.slice(sep + 2),
    };
  };

  const handleAppealFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const encoded = await Promise.all(Array.from(files).map(encodeAttachment));
    setAppealAttachments((prev) => [...prev, ...encoded]);
  };

  const handleBuyerReplyFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const encoded = await Promise.all(Array.from(files).map(encodeAttachment));
    setBuyerReplyAttachments((prev) => [...prev, ...encoded]);
  };

  const handleSubmitAppeal = () => {
    if (!currentUser || !appealOrder) return;

    const message = appealMessage.trim();
    if (!message) {
      toast.error(language === 'ru' ? 'Опишите проблему с товаром' : language === 'zh' ? '请描述商品问题' : 'Please describe the product issue');
      return;
    }

    const sellerId = appealOrder.items
      ?.map((i) => db.getProductById(i.productId)?.sellerId)
      .find(Boolean);

    const ticket = db.createTicket({
      orderId: appealOrder.id,
      buyerId: currentUser.id,
      sellerId,
      status: 'OPEN',
      type: 'DISPUTE',
      subject: language === 'ru'
        ? `Апелляция по заказу #${appealOrder.id.slice(0, 8)}: неисправный товар`
        : language === 'zh'
          ? `订单 #${appealOrder.id.slice(0, 8)} 申诉：商品有问题`
          : `Appeal for order #${appealOrder.id.slice(0, 8)}: faulty product`,
    });

    db.createTicketMessage({
      ticketId: ticket.id,
      senderId: currentUser.id,
      senderType: 'BUYER',
      message,
      attachments: appealAttachments,
    });

    setSelectedTicket(db.getTicketById(ticket.id) || ticket);
    setBuyerReply('');
    setShowTicketDialog(true);

    setShowAppealDialog(false);
    setAppealOrder(null);
    setAppealMessage('');
    setAppealAttachments([]);
    toast.success(language === 'ru' ? 'Апелляция отправлена администратору' : language === 'zh' ? '申诉已提交给管理员' : 'Appeal submitted to admin');
  };

  const openTicketChat = (orderId: string) => {
    const ticket = db.getTicketsByOrder(orderId).find(
      (t) => t.type === 'DISPUTE' && t.buyerId === currentUser?.id
    );
    if (!ticket) {
      toast.error(language === 'ru' ? 'Апелляция не найдена' : language === 'zh' ? '未找到申诉' : 'Appeal not found');
      return;
    }
    setSelectedTicket(ticket);
    setBuyerReply('');
    setBuyerReplyAttachments([]);
    setShowTicketDialog(true);
  };

  const sendBuyerReply = () => {
    if (!currentUser || !selectedTicket || !buyerReply.trim()) return;
    db.createTicketMessage({
      ticketId: selectedTicket.id,
      senderId: currentUser.id,
      senderType: 'BUYER',
      message: buyerReply.trim(),
      attachments: buyerReplyAttachments,
    });
    setSelectedTicket(db.getTicketById(selectedTicket.id) || selectedTicket);
    setBuyerReply('');
    setBuyerReplyAttachments([]);
  };

  const downloadAllPurchasedAccounts = () => {
    const lines = orders
      .filter((o) => o.paymentStatus === 'CONFIRMED')
      .flatMap((o) => (o.stockItems || []).map((s) => s.dataContent));

    if (lines.length === 0) {
      toast.error(language === 'ru' ? 'Нет купленных аккаунтов для скачивания' : language === 'zh' ? '没有可下载的已购买账号' : 'No purchased accounts to download');
      return;
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_purchased_accounts_${lines.length}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(language === 'ru' ? 'Файл со всеми купленными аккаунтами скачан' : language === 'zh' ? '所有已购买账号已下载' : 'All purchased accounts downloaded');
  };

  const totalSpent = orders
    .filter(o => o.paymentStatus === 'CONFIRMED')
    .reduce((sum, o) => sum + o.totalPriceRub, 0);

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.paymentStatus === 'CONFIRMED').length;

  if (!currentUser) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>
              {language === 'ru' ? 'Требуется вход' : language === 'zh' ? '需要登录' : 'Login Required'}
            </CardTitle>
            <CardDescription>
              {language === 'ru' ? 'Войдите чтобы просмотреть заказы' : language === 'zh' ? '登录查看订单' : 'Please login to view your orders'}
            </CardDescription>
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setCurrentView('MARKETPLACE')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {language === 'ru' ? 'Мой аккаунт' : language === 'zh' ? '我的账户' : 'My Account'}
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Баланс' : language === 'zh' ? '余额' : 'Balance'}
                  </p>
                  <p className="font-bold">{formatPriceRub(currentUser.balanceRub, language)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Package className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Заказов' : language === 'zh' ? '订单数' : 'Orders'}
                  </p>
                  <p className="font-bold">{totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Выполнено' : language === 'zh' ? '已完成' : 'Completed'}
                  </p>
                  <p className="font-bold">{completedOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Потрачено' : language === 'zh' ? '已花费' : 'Spent'}
                  </p>
                  <p className="font-bold">{formatPriceRub(totalSpent, language)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">
              <Package className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Заказы' : language === 'zh' ? '订单' : 'Orders'}
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <Bitcoin className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Транзакции' : language === 'zh' ? '交易' : 'Transactions'}
            </TabsTrigger>
            <TabsTrigger value="balance">
              <Wallet className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Баланс' : language === 'zh' ? '余额' : 'Balance'}
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ru' ? 'История заказов' : language === 'zh' ? '订单历史' : 'Order History'}
                </CardTitle>
                <CardDescription>
                  {language === 'ru' ? 'Все ваши заказы и их статус' : language === 'zh' ? '您的所有订单及状态' : 'All your orders and their status'}
                </CardDescription>
                <div>
                  <Button variant="outline" size="sm" onClick={downloadAllPurchasedAccounts}>
                    {language === 'ru' ? 'Скачать все аккаунты' : language === 'zh' ? '下载全部账号' : 'Download All Accounts'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {language === 'ru' ? 'У вас пока нет заказов' : language === 'zh' ? '您还没有订单' : 'You have no orders yet'}
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setCurrentView('MARKETPLACE')}
                    >
                      {language === 'ru' ? 'Начать покупки' : language === 'zh' ? '开始购物' : 'Start Shopping'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      (() => {
                        const hasAppeal = db.getTicketsByOrder(order.id).some(
                          (t) => t.type === 'DISPUTE' && t.buyerId === currentUser?.id
                        );

                        return (
                      <div 
                        key={order.id} 
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-medium">#{order.id.slice(0, 8)}</span>
                              {getStatusBadge(order.paymentStatus)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(order.createdAt, language)}
                            </p>
                            <p className="text-sm mt-1">
                              {order.items?.length || 0} {language === 'ru' ? 'товаров' : language === 'zh' ? '商品' : 'items'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatPriceRub(order.totalPriceRub, language)}</p>
                            <p className="text-sm text-muted-foreground">{formatPriceUsd(order.totalPriceUsd, language)}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              {language === 'ru' ? 'Просмотр' : language === 'zh' ? '查看' : 'View'}
                            </Button>
                            {order.paymentStatus === 'CONFIRMED' && (
                              <Button variant="outline" size="sm" onClick={() => handleOpenAppeal(order)}>
                                <MessageSquare className="w-4 h-4 mr-1" />
                                {language === 'ru' ? 'Апелляция' : language === 'zh' ? '申诉' : 'Appeal'}
                              </Button>
                            )}
                            {hasAppeal && (
                              <Button variant="outline" size="sm" onClick={() => openTicketChat(order.id)}>
                                {language === 'ru' ? 'Чат спора' : language === 'zh' ? '申诉聊天' : 'Dispute Chat'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                        );
                      })()
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ru' ? 'История транзакций' : language === 'zh' ? '交易历史' : 'Transaction History'}
                </CardTitle>
                <CardDescription>
                  {language === 'ru' ? 'Все ваши криптовалютные транзакции' : language === 'zh' ? '您的所有加密货币交易' : 'All your cryptocurrency transactions'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cryptoTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Bitcoin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {language === 'ru' ? 'Нет транзакций' : language === 'zh' ? '没有交易' : 'No transactions yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cryptoTransactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${tx.type === 'DEPOSIT' ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                              {tx.type === 'DEPOSIT' ? 
                                <TrendingUp className="w-4 h-4 text-green-500" /> : 
                                <TrendingDown className="w-4 h-4 text-orange-500" />
                              }
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                {getTxTypeBadge(tx.type)}
                                <Badge variant="outline">{tx.cryptoType}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(tx.createdAt, language)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${tx.type === 'DEPOSIT' ? 'text-green-500' : 'text-orange-500'}`}>
                              {tx.type === 'DEPOSIT' ? '+' : '-'}{formatPriceRub(tx.amountRub, language)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {tx.amountCrypto} {tx.cryptoType}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Tab */}
          <TabsContent value="balance">
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ru' ? 'Управление балансом' : language === 'zh' ? '余额管理' : 'Balance Management'}
                </CardTitle>
                <CardDescription>
                  {language === 'ru' ? 'Пополнение и вывод средств' : language === 'zh' ? '充值和提现' : 'Deposit and withdraw funds'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {language === 'ru' ? 'Доступно (RUB)' : language === 'zh' ? '可用 (RUB)' : 'Available (RUB)'}
                          </p>
                          <p className="text-2xl font-bold">{formatPriceRub(currentUser.balanceRub, language)}</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Wallet className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ≈ {formatPriceUsd(currentUser.balanceUsd, language)}
                      </p>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => setCurrentView('DEPOSIT')}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {language === 'ru' ? 'Пополнить баланс' : language === 'zh' ? '充值' : 'Deposit'}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-3">
                    {language === 'ru' ? 'Информация' : language === 'zh' ? '信息' : 'Information'}
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      {language === 'ru' 
                        ? '• Минимальное пополнение: 500 RUB / 5 USD' 
                        : language === 'zh' 
                          ? '• 最低充值：500 RUB / 5 USD'
                          : '• Minimum deposit: 500 RUB / 5 USD'}
                    </p>
                    <p>
                      {language === 'ru' 
                        ? '• Комиссия на вывод: 10%' 
                        : language === 'zh' 
                          ? '• 提现手续费：10%'
                          : '• Withdrawal fee: 10%'}
                    </p>
                    <p>
                      {language === 'ru' 
                        ? '• Поддерживаемые криптовалюты: BTC, ETH, USDT, TRX' 
                        : language === 'zh' 
                          ? '• 支持的加密货币：BTC, ETH, USDT, TRX'
                          : '• Supported cryptocurrencies: BTC, ETH, USDT, TRX'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Details Dialog */}
        <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {language === 'ru' ? 'Детали заказа' : language === 'zh' ? '订单详情' : 'Order Details'}
              </DialogTitle>
              <DialogDescription>
                #{selectedOrder?.id.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  {getStatusBadge(selectedOrder.paymentStatus)}
                  <span className="text-sm text-muted-foreground">
                    {formatDate(selectedOrder.createdAt, language)}
                  </span>
                </div>

                <div>
                  <h4 className="font-medium mb-3">
                    {language === 'ru' ? 'Товары' : language === 'zh' ? '商品' : 'Items'}
                  </h4>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item) => {
                      const product = db.getProductById(item.productId);
                      return (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{language === 'ru' ? product?.titleRu : product?.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {language === 'ru' ? 'Количество' : language === 'zh' ? '数量' : 'Qty'}: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatPriceRub(item.priceRub * item.quantity, language)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {language === 'ru' ? 'Подытог' : language === 'zh' ? '小计' : 'Subtotal'}
                    </span>
                    <span>{formatPriceRub(selectedOrder.totalPriceRub, language)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {language === 'ru' ? 'Комиссия' : language === 'zh' ? '手续费' : 'Platform Fee'}
                    </span>
                    <span>{formatPriceRub(selectedOrder.platformFeeRub, language)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2">
                    <span>{language === 'ru' ? 'Итого' : language === 'zh' ? '总计' : 'Total'}</span>
                    <span>{formatPriceRub(selectedOrder.totalPriceRub + selectedOrder.platformFeeRub, language)}</span>
                  </div>
                </div>

                {selectedOrder.paymentStatus === 'CONFIRMED' && selectedOrder.stockItems && selectedOrder.stockItems.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">
                      {language === 'ru' ? 'Данные аккаунтов' : language === 'zh' ? '账户数据' : 'Account Data'}
                    </h4>
                    <div className="space-y-2">
                      {selectedOrder.stockItems.map((stock) => (
                        <div key={stock.id} className="flex items-center gap-2 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                          <code className="flex-1 text-sm font-mono truncate">{stock.dataContent}</code>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => copyToClipboard(stock.dataContent)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Appeal Dialog */}
        <Dialog open={showAppealDialog} onOpenChange={setShowAppealDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {language === 'ru' ? 'Апелляция по заказу' : language === 'zh' ? '订单申诉' : 'Order Appeal'}
              </DialogTitle>
              <DialogDescription>
                #{appealOrder?.id.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={appealMessage}
                onChange={(e) => setAppealMessage(e.target.value)}
                placeholder={
                  language === 'ru'
                    ? 'Опишите проблему: что не работает, какие данные неверны, и т.д.'
                    : language === 'zh'
                      ? '请描述问题：哪里无法使用、哪些数据有误等。'
                      : 'Describe the issue: what is faulty, invalid data, etc.'
                }
                className="min-h-[140px]"
              />
              <Input
                type="file"
                multiple
                onChange={(e) => void handleAppealFileSelect(e.target.files)}
              />
              {appealAttachments.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {appealAttachments.length} {language === 'ru' ? 'файл(ов) прикреплено' : language === 'zh' ? '已附加文件' : 'file(s) attached'}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAppealDialog(false)}>
                  {language === 'ru' ? 'Отмена' : language === 'zh' ? '取消' : 'Cancel'}
                </Button>
                <Button className="flex-1" onClick={handleSubmitAppeal}>
                  {language === 'ru' ? 'Отправить апелляцию' : language === 'zh' ? '提交申诉' : 'Submit Appeal'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Buyer/Admin dispute chat */}
        <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {language === 'ru' ? 'Чат по апелляции' : language === 'zh' ? '申诉聊天' : 'Appeal Chat'}
              </DialogTitle>
              <DialogDescription>#{selectedTicket?.id.slice(0, 8)}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {(selectedTicket?.messages || []).map((m) => (
                <div key={m.id} className="border rounded p-3">
                  <div className="text-xs text-muted-foreground mb-1">{m.senderType} • {formatDate(m.createdAt, language)}</div>
                  <div className="text-sm whitespace-pre-wrap">{m.message}</div>
                  {!!m.attachments?.length && (
                    <div className="mt-2 space-y-2">
                      {m.attachments.map((raw, idx) => {
                        const { name, url } = parseAttachment(raw);
                        const isImage = url.startsWith('data:image/');
                        return (
                          <div key={`${m.id}-${idx}`} className="text-xs">
                            {isImage ? (
                              <img src={url} alt={name} className="max-h-48 rounded border mb-1" />
                            ) : null}
                            <a href={url} download={name} className="underline text-blue-600">
                              {name}
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Input
                type="file"
                multiple
                onChange={(e) => void handleBuyerReplyFileSelect(e.target.files)}
              />
              {buyerReplyAttachments.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {buyerReplyAttachments.length} {language === 'ru' ? 'файл(ов) прикреплено' : language === 'zh' ? '已附加文件' : 'file(s) attached'}
                </div>
              )}
              <Textarea
                value={buyerReply}
                onChange={(e) => setBuyerReply(e.target.value)}
                placeholder={language === 'ru' ? 'Напишите сообщение администратору...' : language === 'zh' ? '给管理员留言...' : 'Write a message to admin...'}
              />
              <Button onClick={sendBuyerReply} className="w-full">
                {language === 'ru' ? 'Отправить' : language === 'zh' ? '发送' : 'Send'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
