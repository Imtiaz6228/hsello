import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { db } from '@/store/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
// Switch not used
import { toast } from 'sonner';
import { formatPriceRub, formatDate } from '@/lib/i18n';
import { 
  LayoutDashboard, 
  Users, 
  Package,
  FolderTree, 
  MessageSquare, 
  Settings,
  ArrowLeft, 
  DollarSign,
  ShoppingBag,
  Ban,
  CheckCircle,
  XCircle,
  Wallet,
  BarChart3,
  Search,
  Shield,
  TrendingDown
} from 'lucide-react';
import type { User, Category, Ticket, Product, ProductModerationStatus } from '@/types';

export function AdminDashboard() {
  const { 
    currentUser, 
    language, 
    setCurrentView,
    orders,
    refreshOrders,

    getAdminBalance,
    withdrawAdminBalance
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [announcementRu, setAnnouncementRu] = useState('');
  const [announcementZh, setAnnouncementZh] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [adminReply, setAdminReply] = useState('');
  const [adminReplyAttachments, setAdminReplyAttachments] = useState<string[]>([]);
  const [adminWithdrawAmountRub, setAdminWithdrawAmountRub] = useState('1000');
  const [categoryImageUploadingId, setCategoryImageUploadingId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      loadData();
      const config = db.getSiteConfig();
      setAnnouncement(config.announcement || '');
      setAnnouncementRu(config.announcementRu || '');
      setAnnouncementZh(config.announcementZh || '');
    }
  }, [currentUser]);

  const loadData = () => {
    setUsers(Array.from(db.users.values()));
    setCategories(db.getAllCategories());
    setProducts(db.getAllProductsForAdmin());
    setTickets(db.getAllTickets());
    refreshOrders();
  };

  const adminBalance = getAdminBalance();
  const totalUsers = users.length;
  const totalSellers = users.filter(u => u.role === 'SELLER').length;
  const totalBuyers = users.filter(u => u.role === 'BUYER').length;
  const bannedUsers = users.filter(u => u.isBanned).length;
  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'CONFIRMED')
    .reduce((sum, o) => sum + o.platformFeeRub, 0);
  const pendingTickets = tickets.filter(t => t.status === 'OPEN').length;
  const appealsCount = tickets.filter(t => t.type === 'DISPUTE').length;
  const pendingSellerModeration = users.filter(
    u => u.role === 'SELLER' && u.sellerModerationStatus === 'PENDING'
  ).length;
  const pendingProductModeration = products.filter((p) => p.moderationStatus === 'PENDING').length;
  const totalInsuranceRub = users
    .filter((u) => u.role === 'SELLER')
    .reduce((sum, u) => sum + (u.insuranceBalanceRub ?? 0), 0);

  const insuranceByLevel = users
    .filter((u) => u.role === 'SELLER')
    .reduce(
      (acc, u) => {
        const level = u.insuranceLevel || 'NONE';
        acc[level] += 1;
        return acc;
      },
      { NONE: 0, LEVEL_3: 0, LEVEL_2: 0, LEVEL_1: 0 } as Record<'NONE' | 'LEVEL_3' | 'LEVEL_2' | 'LEVEL_1', number>
    );

  const handleAdminWithdrawBalance = () => {
    const amount = parseInt(adminWithdrawAmountRub, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error(language === 'ru' ? 'Введите корректную сумму' : language === 'zh' ? '请输入有效金额' : 'Enter valid amount');
      return;
    }

    const result = withdrawAdminBalance(amount);
    if (!result.success) {
      toast.error(result.error || (language === 'ru' ? 'Не удалось вывести баланс платформы' : language === 'zh' ? '平台余额提现失败' : 'Failed to withdraw platform balance'));
      return;
    }

    toast.success(
      language === 'ru'
        ? 'Вывод баланса платформы выполнен'
        : language === 'zh'
          ? '平台余额提现成功'
          : 'Platform balance withdrawn'
    );
    loadData();
  };

  const getProductModerationBadgeClass = (status?: ProductModerationStatus) => {
    if (status === 'APPROVED') return 'bg-green-500/10 text-green-600';
    if (status === 'REJECTED') return 'bg-red-500/10 text-red-600';
    if (status === 'HOLD') return 'bg-yellow-500/10 text-yellow-600';
    if (status === 'DISCONTINUED') return 'bg-gray-500/10 text-gray-600';
    return 'bg-amber-500/10 text-amber-600';
  };

  const handleBanUser = (userId: string, ban: boolean) => {
    db.updateUser(userId, { isBanned: ban });
    loadData();
    toast.success(ban 
      ? (language === 'ru' ? 'Пользователь заблокирован' : language === 'zh' ? '用户已封禁' : 'User banned')
      : (language === 'ru' ? 'Пользователь разблокирован' : language === 'zh' ? '用户已解封' : 'User unbanned')
    );
  };

  const handleSaveAnnouncement = () => {
    db.updateSiteConfig({
      announcement,
      announcementRu,
      announcementZh,
    });
    toast.success(language === 'ru' ? 'Сохранено!' : language === 'zh' ? '已保存!' : 'Saved!');
  };

  const handleModerateSeller = (sellerId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    if (!currentUser) return;

    const reason =
      status !== 'APPROVED'
        ? window.prompt(
            status === 'REJECTED'
              ? (language === 'ru'
                  ? 'Укажите причину отклонения (необязательно)'
                  : language === 'zh'
                    ? '填写拒绝原因（可选）'
                    : 'Enter rejection reason (optional)')
              : (language === 'ru'
                  ? 'Укажите комментарий для возврата на модерацию (необязательно)'
                  : language === 'zh'
                    ? '填写退回待审核备注（可选）'
                    : 'Enter note for moving back to pending (optional)')
          ) || undefined
        : undefined;

    const updated = db.moderateSellerAccount(sellerId, currentUser.id, status, reason);
    if (!updated) {
      toast.error(language === 'ru' ? 'Не удалось промодерировать продавца' : language === 'zh' ? '卖家审核失败' : 'Failed to moderate seller');
      return;
    }

    loadData();
    toast.success(status === 'APPROVED'
      ? (language === 'ru' ? 'Продавец одобрен, email отправлен' : language === 'zh' ? '卖家已通过，邮件已发送' : 'Seller approved, email sent')
      : status === 'REJECTED'
        ? (language === 'ru' ? 'Продавец отклонен, email отправлен' : language === 'zh' ? '卖家已拒绝，邮件已发送' : 'Seller rejected, email sent')
        : (language === 'ru' ? 'Продавец возвращен на модерацию, email отправлен' : language === 'zh' ? '卖家已退回待审核，邮件已发送' : 'Seller moved back to pending, email sent')
    );
  };

  const handleModerateProduct = (
    productId: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HOLD' | 'DISCONTINUED'
  ) => {
    if (!currentUser) return;

    const reason =
      status !== 'APPROVED'
        ? window.prompt(
            language === 'ru'
              ? 'Укажите причину/комментарий (необязательно)'
              : language === 'zh'
                ? '请输入原因/备注（可选）'
                : 'Enter reason/note (optional)'
          ) || undefined
        : undefined;

    const updated =
      status === 'DISCONTINUED'
        ? db.discontinueProduct(productId, currentUser.id, reason)
        : db.moderateProduct(productId, currentUser.id, status, reason);

    if (!updated) {
      toast.error(
        language === 'ru'
          ? 'Не удалось обновить статус товара'
          : language === 'zh'
            ? '更新商品状态失败'
            : 'Failed to update product status'
      );
      return;
    }

    loadData();
    toast.success(
      language === 'ru'
        ? `Статус товара обновлен: ${status}`
        : language === 'zh'
          ? `商品状态已更新：${status}`
          : `Product status updated: ${status}`
    );
  };

  const openTicketChat = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setAdminReply('');
    setAdminReplyAttachments([]);
    setShowTicketDialog(true);
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCategoryImageSelect = async (categoryId: string, file: File | null) => {
    if (!file) return;

    setCategoryImageUploadingId(categoryId);
    try {
      const dataUrl = await fileToDataUrl(file);
      db.updateCategory(categoryId, { imageUrl: dataUrl });
      loadData();
      toast.success(
        language === 'ru'
          ? 'Изображение категории обновлено'
          : language === 'zh'
            ? '分类图片已更新'
            : 'Category image updated'
      );
    } catch {
      toast.error(
        language === 'ru'
          ? 'Не удалось загрузить изображение категории'
          : language === 'zh'
            ? '分类图片上传失败'
            : 'Failed to upload category image'
      );
    } finally {
      setCategoryImageUploadingId(null);
    }
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

  const handleAdminReplyFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const encoded = await Promise.all(Array.from(files).map(encodeAttachment));
    setAdminReplyAttachments((prev) => [...prev, ...encoded]);
  };

  const sendAdminReply = () => {
    if (!currentUser || !selectedTicket || !adminReply.trim()) return;
    db.createTicketMessage({
      ticketId: selectedTicket.id,
      senderId: currentUser.id,
      senderType: 'ADMIN',
      message: adminReply.trim(),
      attachments: adminReplyAttachments,
    });
    const updated = db.getTicketById(selectedTicket.id) || selectedTicket;
    setSelectedTicket(updated);
    setAdminReply('');
    setAdminReplyAttachments([]);
    loadData();
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.supplierId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>{language === 'ru' ? 'Доступ запрещен' : language === 'zh' ? '访问被拒绝' : 'Access Denied'}</CardTitle>
            <CardDescription>{language === 'ru' ? 'Только для администраторов' : language === 'zh' ? '仅限管理员' : 'Admin only'}</CardDescription>
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setCurrentView('MARKETPLACE')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {language === 'ru' ? 'Панель администратора' : language === 'zh' ? '管理员面板' : 'Admin Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground">{currentUser.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Wallet className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Баланс' : language === 'zh' ? '余额' : 'Balance'}</p>
                  <p className="font-bold">{formatPriceRub(adminBalance.rub, language)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Shield className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Страховой пул' : language === 'zh' ? '保险池' : 'Insurance Pool'}</p>
                  <p className="font-bold">{formatPriceRub(totalInsuranceRub, language)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Пользователи' : language === 'zh' ? '用户' : 'Users'}</p>
                  <p className="font-bold">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Заказы' : language === 'zh' ? '订单' : 'Orders'}</p>
                  <p className="font-bold">{totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Доход' : language === 'zh' ? '收入' : 'Revenue'}</p>
                  <p className="font-bold">{formatPriceRub(totalRevenue, language)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Обзор' : language === 'zh' ? '概览' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Пользователи' : language === 'zh' ? '用户' : 'Users'}
            </TabsTrigger>
            <TabsTrigger value="categories">
              <FolderTree className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Категории' : language === 'zh' ? '类别' : 'Categories'}
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Товары' : language === 'zh' ? '商品' : 'Products'}
            </TabsTrigger>
            <TabsTrigger value="disputes">
              <MessageSquare className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Тикеты' : language === 'zh' ? '工单' : 'Tickets'}
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Настройки' : language === 'zh' ? '设置' : 'Settings'}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ru' ? 'Статистика пользователей' : language === 'zh' ? '用户统计' : 'User Statistics'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Всего пользователей' : language === 'zh' ? '总用户' : 'Total Users'}</span>
                    <span className="font-medium">{totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Продавцы' : language === 'zh' ? '卖家' : 'Sellers'}</span>
                    <span className="font-medium">{totalSellers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'На модерации' : language === 'zh' ? '审核中' : 'In moderation'}</span>
                    <span className="font-medium text-yellow-600">{pendingSellerModeration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Товары на модерации' : language === 'zh' ? '待审核商品' : 'Products in moderation'}</span>
                    <span className="font-medium text-amber-600">{pendingProductModeration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Покупатели' : language === 'zh' ? '买家' : 'Buyers'}</span>
                    <span className="font-medium">{totalBuyers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Заблокированы' : language === 'zh' ? '已封禁' : 'Banned'}</span>
                    <span className="font-medium text-red-500">{bannedUsers}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ru' ? 'Статистика заказов' : language === 'zh' ? '订单统计' : 'Order Statistics'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Всего заказов' : language === 'zh' ? '总订单' : 'Total Orders'}</span>
                    <span className="font-medium">{totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Выполнено' : language === 'zh' ? '已完成' : 'Completed'}</span>
                    <span className="font-medium text-green-500">{orders.filter(o => o.paymentStatus === 'CONFIRMED').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'В ожидании' : language === 'zh' ? '待处理' : 'Pending'}</span>
                    <span className="font-medium text-yellow-500">{orders.filter(o => o.paymentStatus === 'PENDING').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Открытые тикеты' : language === 'zh' ? '开放工单' : 'Open Tickets'}</span>
                    <span className="font-medium text-orange-500">{pendingTickets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Апелляции' : language === 'zh' ? '申诉' : 'Appeals'}</span>
                    <span className="font-medium text-red-500">{appealsCount}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ru' ? 'Финансы' : language === 'zh' ? '财务' : 'Finance'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Общий доход' : language === 'zh' ? '总收入' : 'Total Revenue'}</span>
                    <span className="font-medium">{formatPriceRub(totalRevenue, language)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Баланс платформы' : language === 'zh' ? '平台余额' : 'Platform Balance'}</span>
                    <span className="font-medium">{formatPriceRub(adminBalance.rub, language)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Страховой пул' : language === 'zh' ? '保险池' : 'Insurance Pool'}</span>
                    <span className="font-medium">{formatPriceRub(totalInsuranceRub, language)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Badge variant="outline" className="justify-center bg-emerald-500/10 text-emerald-600 border-emerald-500/30">L1: {insuranceByLevel.LEVEL_1}</Badge>
                    <Badge variant="outline" className="justify-center bg-blue-500/10 text-blue-600 border-blue-500/30">L2: {insuranceByLevel.LEVEL_2}</Badge>
                    <Badge variant="outline" className="justify-center bg-amber-500/10 text-amber-600 border-amber-500/30">L3: {insuranceByLevel.LEVEL_3}</Badge>
                    <Badge variant="outline" className="justify-center bg-muted text-muted-foreground border-border">NONE: {insuranceByLevel.NONE}</Badge>
                  </div>

                  <div className="space-y-2 rounded-lg border border-border/60 bg-background/60 p-3">
                    <p className="text-xs text-muted-foreground">
                      {language === 'ru' ? 'Вывод средств платформы' : language === 'zh' ? '平台余额提现' : 'Platform Balance Withdraw'}
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={adminWithdrawAmountRub}
                        onChange={(e) => setAdminWithdrawAmountRub(e.target.value)}
                        placeholder="1000"
                      />
                      <Button variant="outline" onClick={handleAdminWithdrawBalance}>
                        <TrendingDown className="w-4 h-4 mr-1" />
                        {language === 'ru' ? 'Вывести' : language === 'zh' ? '提现' : 'Withdraw'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ru' ? 'Категории' : language === 'zh' ? '类别' : 'Categories'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Всего категорий' : language === 'zh' ? '总类别' : 'Total Categories'}</span>
                    <span className="font-medium">{categories.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Активные' : language === 'zh' ? '活跃' : 'Active'}</span>
                    <span className="font-medium text-green-500">{categories.filter(c => c.isActive).length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>{language === 'ru' ? 'Управление пользователями' : language === 'zh' ? '用户管理' : 'User Management'}</CardTitle>
                    <CardDescription>{totalUsers} {language === 'ru' ? 'пользователей' : language === 'zh' ? '用户' : 'users'}</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder={language === 'ru' ? 'Поиск...' : language === 'zh' ? '搜索...' : 'Search...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full md:w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{user.email}</span>
                            <Badge variant={user.role === 'ADMIN' ? 'destructive' : user.role === 'SELLER' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                            {user.role === 'SELLER' && (
                              <Badge
                                variant="outline"
                                className={
                                  user.sellerModerationStatus === 'APPROVED'
                                    ? 'bg-green-500/10 text-green-600'
                                    : user.sellerModerationStatus === 'REJECTED'
                                      ? 'bg-red-500/10 text-red-600'
                                      : 'bg-yellow-500/10 text-yellow-600'
                                }
                              >
                                {user.sellerModerationStatus || 'PENDING'}
                              </Badge>
                            )}
                            {user.isBanned && <Badge variant="outline" className="bg-red-500/10 text-red-500">BANNED</Badge>}
                          </div>
                          {user.supplierId && (
                            <p className="text-sm text-muted-foreground">{language === 'ru' ? 'ID' : language === 'zh' ? 'ID' : 'ID'}: {user.supplierId}</p>
                          )}
                          {user.role === 'SELLER' && user.storeName && (
                            <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Магазин' : language === 'zh' ? '店铺' : 'Store'}: {user.storeName}</p>
                          )}
                          {user.role === 'SELLER' && user.storeDescription && (
                            <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Описание' : language === 'zh' ? '描述' : 'Description'}: {user.storeDescription}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{formatPriceRub(user.balanceRub, language)}</span>
                            {user.role === 'SELLER' && (
                              <span className="flex items-center gap-1">
                                <BarChart3 className="w-3 h-3" />
                                {user.reputation.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                        {user.role !== 'ADMIN' && (
                          <div className="flex gap-2">
                            {user.role === 'SELLER' && (
                              <>
                                {user.sellerModerationStatus !== 'APPROVED' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleModerateSeller(user.id, 'APPROVED')}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    {language === 'ru' ? 'Одобрить' : language === 'zh' ? '通过' : 'Approve'}
                                  </Button>
                                )}
                                {user.sellerModerationStatus !== 'REJECTED' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleModerateSeller(user.id, 'REJECTED')}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    {language === 'ru' ? 'Отклонить' : language === 'zh' ? '拒绝' : 'Reject'}
                                  </Button>
                                )}
                                {user.sellerModerationStatus !== 'PENDING' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleModerateSeller(user.id, 'PENDING')}
                                  >
                                    {language === 'ru' ? 'Вернуть на модерацию' : language === 'zh' ? '退回待审核' : 'Move to Pending'}
                                  </Button>
                                )}
                              </>
                            )}
                            <Button 
                              variant={user.isBanned ? 'outline' : 'destructive'}
                              size="sm"
                              onClick={() => handleBanUser(user.id, !user.isBanned)}
                            >
                              {user.isBanned ? (
                                <><CheckCircle className="w-4 h-4 mr-1" /> {language === 'ru' ? 'Разблокировать' : language === 'zh' ? '解封' : 'Unban'}</>
                              ) : (
                                <><Ban className="w-4 h-4 mr-1" /> {language === 'ru' ? 'Заблокировать' : language === 'zh' ? '封禁' : 'Ban'}</>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ru' ? 'Категории' : language === 'zh' ? '类别' : 'Categories'}</CardTitle>
                <CardDescription>{categories.length} {language === 'ru' ? 'категорий' : language === 'zh' ? '类别' : 'categories'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-md border border-border/60 overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
                            {category.imageUrl ? (
                              <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
                            ) : (
                              <FolderTree className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{language === 'ru' ? category.nameRu : category.name}</span>
                              <Badge variant={category.isActive ? 'default' : 'secondary'}>
                                {category.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{category.slug}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Label className="text-xs text-muted-foreground cursor-pointer underline underline-offset-2">
                            {categoryImageUploadingId === category.id
                              ? (language === 'ru' ? 'Загрузка...' : language === 'zh' ? '上传中...' : 'Uploading...')
                              : (language === 'ru' ? 'Загрузить изображение' : language === 'zh' ? '上传图片' : 'Upload image')}
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={categoryImageUploadingId === category.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                void handleCategoryImageSelect(category.id, file);
                                e.currentTarget.value = '';
                              }}
                            />
                          </Label>

                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{language === 'ru' ? 'В наличии' : language === 'zh' ? '库存' : 'Stock'}: {db.getCategoryStockCount(category.id)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ru' ? 'Модерация товаров' : language === 'zh' ? '商品审核' : 'Product Moderation'}</CardTitle>
                <CardDescription>
                  {products.length} {language === 'ru' ? 'товаров всего' : language === 'zh' ? '个商品' : 'products total'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {products.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{language === 'ru' ? product.titleRu : product.title}</span>
                            <Badge variant="outline" className={getProductModerationBadgeClass(product.moderationStatus)}>
                              {product.moderationStatus || 'PENDING'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {language === 'ru' ? 'Продавец' : language === 'zh' ? '卖家' : 'Seller'}: {product.seller?.storeName || product.seller?.supplierId || product.seller?.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {language === 'ru' ? 'Категория' : language === 'zh' ? '类别' : 'Category'}: {language === 'ru' ? product.category?.nameRu : product.category?.name}
                          </p>
                          {product.moderationReason && (
                            <p className="text-xs text-muted-foreground mt-1">{product.moderationReason}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleModerateProduct(product.id, 'APPROVED')}
                            disabled={product.moderationStatus === 'APPROVED'}
                          >
                            {language === 'ru' ? 'Approve' : language === 'zh' ? '通过' : 'Approve'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleModerateProduct(product.id, 'REJECTED')}
                            disabled={product.moderationStatus === 'REJECTED'}
                          >
                            {language === 'ru' ? 'Reject' : language === 'zh' ? '拒绝' : 'Reject'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleModerateProduct(product.id, 'HOLD')}
                            disabled={product.moderationStatus === 'HOLD'}
                          >
                            {language === 'ru' ? 'On Hold' : language === 'zh' ? '搁置' : 'On Hold'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleModerateProduct(product.id, 'PENDING')}
                            disabled={product.moderationStatus === 'PENDING'}
                          >
                            {language === 'ru' ? 'Pending' : language === 'zh' ? '待审核' : 'Pending'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleModerateProduct(product.id, 'DISCONTINUED')}
                            disabled={product.moderationStatus === 'DISCONTINUED'}
                          >
                            {language === 'ru' ? 'Discontinue' : language === 'zh' ? '下架' : 'Discontinue'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="disputes">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ru' ? 'Тикеты поддержки' : language === 'zh' ? '支持工单' : 'Support Tickets'}</CardTitle>
                <CardDescription>{tickets.length} {language === 'ru' ? 'тикетов' : language === 'zh' ? '工单' : 'tickets'}</CardDescription>
              </CardHeader>
              <CardContent>
                {tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{language === 'ru' ? 'Нет тикетов' : language === 'zh' ? '没有工单' : 'No tickets'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">#{ticket.id.slice(0, 8)}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={ticket.type === 'DISPUTE' ? 'destructive' : 'outline'}>
                              {ticket.type}
                            </Badge>
                            <Badge variant={ticket.status === 'OPEN' ? 'default' : ticket.status === 'RESOLVED' ? 'secondary' : 'outline'}>
                              {ticket.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(ticket.createdAt, language)}</p>
                        <div className="mt-3">
                          <Button size="sm" variant="outline" onClick={() => openTicketChat(ticket)}>
                            {language === 'ru' ? 'Открыть чат' : language === 'zh' ? '打开聊天' : 'Open Chat'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ru' ? 'Настройки сайта' : language === 'zh' ? '网站设置' : 'Site Settings'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="mb-2 block">{language === 'ru' ? 'Объявление (EN)' : language === 'zh' ? '公告 (EN)' : 'Announcement (EN)'}</Label>
                  <Input 
                    value={announcement} 
                    onChange={(e) => setAnnouncement(e.target.value)}
                    placeholder={language === 'ru' ? 'Текст объявления...' : language === 'zh' ? '公告内容...' : 'Announcement text...'}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">{language === 'ru' ? 'Объявление (RU)' : language === 'zh' ? '公告 (RU)' : 'Announcement (RU)'}</Label>
                  <Input 
                    value={announcementRu} 
                    onChange={(e) => setAnnouncementRu(e.target.value)}
                    placeholder={language === 'ru' ? 'Текст объявления...' : language === 'zh' ? '公告内容...' : 'Announcement text...'}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">{language === 'ru' ? 'Объявление (ZH)' : language === 'zh' ? '公告 (ZH)' : 'Announcement (ZH)'}</Label>
                  <Input 
                    value={announcementZh} 
                    onChange={(e) => setAnnouncementZh(e.target.value)}
                    placeholder={language === 'ru' ? 'Текст объявления...' : language === 'zh' ? '公告内容...' : 'Announcement text...'}
                  />
                </div>
                <Button onClick={handleSaveAnnouncement}>
                  {language === 'ru' ? 'Сохранить' : language === 'zh' ? '保存' : 'Save'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{language === 'ru' ? 'Чат тикета' : language === 'zh' ? '工单聊天' : 'Ticket Chat'}</DialogTitle>
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
                onChange={(e) => void handleAdminReplyFileSelect(e.target.files)}
              />
              {adminReplyAttachments.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {adminReplyAttachments.length} {language === 'ru' ? 'файл(ов) прикреплено' : language === 'zh' ? '已附加文件' : 'file(s) attached'}
                </div>
              )}
              <Textarea
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                placeholder={language === 'ru' ? 'Ответить покупателю...' : language === 'zh' ? '回复买家...' : 'Reply to buyer...'}
              />
              <Button onClick={sendAdminReply} className="w-full">
                {language === 'ru' ? 'Отправить ответ' : language === 'zh' ? '发送回复' : 'Send Reply'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
