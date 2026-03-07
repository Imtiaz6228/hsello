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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatPriceRub, formatPriceUsd, formatDate } from '@/lib/i18n';
import { 
  LayoutDashboard, 
  Package, 
  Upload, 
  ShoppingBag, 
  Wallet,
  ArrowLeft, 
  TrendingDown,
  Star,
  DollarSign,
  Plus,
  Trash2,
  BarChart3,
  Download,
  Pencil,
  Shield,
  ImagePlus
} from 'lucide-react';
import type { Product, FormatType, InsuranceLevel } from '@/types';

export function SellerDashboard() {
  const { 
    currentUser, 
    language, 
    setCurrentView,
    orders,
    refreshOrders,
    cryptoTransactions,
    refreshCryptoTransactions,
    depositSellerInsurance,
    setCurrentUser,
    refreshProducts
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showUploadStock, setShowUploadStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockData, setStockData] = useState('');
  const [insuranceAmountRub, setInsuranceAmountRub] = useState('1000');
  const [isStoreLogoUploading, setIsStoreLogoUploading] = useState(false);
  const [newProductImageDataUrl, setNewProductImageDataUrl] = useState('');
  const [editProductImageDataUrl, setEditProductImageDataUrl] = useState('');

  // Form states for new product
  const [newProduct, setNewProduct] = useState({
    title: '',
    titleRu: '',
    titleZh: '',
    description: '',
    descriptionRu: '',
    descriptionZh: '',
    categoryId: '',
    priceUsd: '',
    formatType: 'SINGLE_LINE' as FormatType,
    delimiter: ':',
    tags: '',
    tagsRu: '',
    tagsZh: '',
    warrantyDays: '24',
  });

  const [editProduct, setEditProduct] = useState({
    id: '',
    title: '',
    titleRu: '',
    titleZh: '',
    description: '',
    descriptionRu: '',
    descriptionZh: '',
    categoryId: '',
    priceUsd: '',
    tags: '',
    tagsRu: '',
    tagsZh: '',
    warrantyDays: '24',
  });

  const getProductTitleByLanguage = (product: Product) => {
    if (language === 'ru') return product.titleRu;
    if (language === 'zh') return product.titleZh;
    return product.title;
  };

  const getCategoryNameByLanguage = (category?: Product['category']) => {
    if (!category) return '';
    if (language === 'ru') return category.nameRu;
    if (language === 'zh') return category.nameZh;
    return category.name;
  };

  useEffect(() => {
    if (currentUser) {
      refreshOrders();
      refreshCryptoTransactions();
      loadProducts();
    }
  }, [currentUser]);

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleStoreLogoSelect = async (file: File | null) => {
    if (!file || !currentUser) return;

    setIsStoreLogoUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const updated = db.updateUser(currentUser.id, { storeLogoUrl: dataUrl });
      if (!updated) {
        throw new Error('Failed to update seller logo');
      }

      setCurrentUser(updated);
      refreshProducts();
      toast.success(
        language === 'ru'
          ? 'Логотип магазина обновлён'
          : language === 'zh'
            ? '店铺 Logo 已更新'
            : 'Store logo updated'
      );
    } catch {
      toast.error(
        language === 'ru'
          ? 'Не удалось загрузить логотип магазина'
          : language === 'zh'
            ? '店铺 Logo 上传失败'
            : 'Failed to upload store logo'
      );
    } finally {
      setIsStoreLogoUploading(false);
    }
  };

  const handleNewProductImageSelect = async (file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setNewProductImageDataUrl(dataUrl);
    } catch {
      toast.error(
        language === 'ru'
          ? 'Не удалось загрузить изображение товара'
          : language === 'zh'
            ? '商品图片上传失败'
            : 'Failed to upload product image'
      );
    }
  };

  const handleEditProductImageSelect = async (file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setEditProductImageDataUrl(dataUrl);
    } catch {
      toast.error(
        language === 'ru'
          ? 'Не удалось загрузить изображение товара'
          : language === 'zh'
            ? '商品图片上传失败'
            : 'Failed to upload product image'
      );
    }
  };

  const loadProducts = () => {
    if (currentUser) {
      const sellerProducts = db.getProductsBySeller(currentUser.id);
      setProducts(sellerProducts);
    }
  };

  const sellerOrders = orders.filter(order => 
    order.items?.some(item => {
      const product = db.getProductById(item.productId);
      return product?.sellerId === currentUser?.id;
    })
  );

  const totalSales = sellerOrders
    .filter(o => o.paymentStatus === 'CONFIRMED')
    .reduce((sum, o) => {
      const sellerItems = o.items?.filter(item => {
        const product = db.getProductById(item.productId);
        return product?.sellerId === currentUser?.id;
      }) || [];
      return sum + sellerItems.reduce((itemSum, item) => itemSum + (item.priceRub * item.quantity), 0);
    }, 0);

  const totalOrders = sellerOrders.length;
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.stockCount || 0), 0);
  const pendingProducts = products.filter((p) => p.moderationStatus === 'PENDING').length;

  const getModerationBadge = (status?: Product['moderationStatus']) => {
    if (status === 'APPROVED') return { label: 'APPROVED', cls: 'bg-green-500/10 text-green-600' };
    if (status === 'REJECTED') return { label: 'REJECTED', cls: 'bg-red-500/10 text-red-600' };
    if (status === 'HOLD') return { label: 'HOLD', cls: 'bg-yellow-500/10 text-yellow-600' };
    if (status === 'DISCONTINUED') return { label: 'DISCONTINUED', cls: 'bg-gray-500/10 text-gray-600' };
    return { label: 'PENDING', cls: 'bg-amber-500/10 text-amber-600' };
  };

  const getInsuranceLevelMeta = (level?: InsuranceLevel) => {
    if (level === 'LEVEL_1') {
      return {
        label: 'L1',
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
        amount: 10000,
      };
    }
    if (level === 'LEVEL_2') {
      return {
        label: 'L2',
        className: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
        amount: 5000,
      };
    }
    if (level === 'LEVEL_3') {
      return {
        label: 'L3',
        className: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
        amount: 1000,
      };
    }
    return {
      label: 'NONE',
      className: 'bg-muted text-muted-foreground border-border',
      amount: 0,
    };
  };

  const insuranceMeta = getInsuranceLevelMeta(currentUser?.insuranceLevel);
  const insuranceBalance = currentUser?.insuranceBalanceRub ?? 0;

  const nextInsuranceTarget =
    insuranceBalance >= 10000
      ? null
      : insuranceBalance >= 5000
        ? 10000
        : insuranceBalance >= 1000
          ? 5000
          : 1000;

  const amountToNextLevel = nextInsuranceTarget ? Math.max(0, nextInsuranceTarget - insuranceBalance) : 0;

  const handleDepositInsurance = () => {
    const amount = parseInt(insuranceAmountRub, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error(language === 'ru' ? 'Введите корректную сумму' : language === 'zh' ? '请输入有效金额' : 'Enter a valid amount');
      return;
    }

    const result = depositSellerInsurance(amount);
    if (!result.success) {
      toast.error(result.error || (language === 'ru' ? 'Не удалось внести страховой депозит' : language === 'zh' ? '保险金充值失败' : 'Insurance deposit failed'));
      return;
    }

    toast.success(
      language === 'ru'
        ? 'Страховой депозит успешно пополнен'
        : language === 'zh'
          ? '保险金充值成功'
          : 'Insurance deposit added successfully'
    );
    refreshOrders();
  };

  const handleCreateProduct = () => {
    if (!currentUser) return;
    if (!newProduct.title || !newProduct.categoryId || !newProduct.priceUsd) {
      toast.error(language === 'ru' ? 'Заполните все обязательные поля' : language === 'zh' ? '填写所有必填字段' : 'Fill all required fields');
      return;
    }

    const priceUsd = parseFloat(newProduct.priceUsd);
    const priceRub = Math.round(priceUsd * 92);
    const tags = newProduct.tags.split(',').map(t => t.trim()).filter(Boolean);
    const tagsRu = newProduct.tagsRu.split(',').map(t => t.trim()).filter(Boolean);
    const tagsZh = newProduct.tagsZh.split(',').map(t => t.trim()).filter(Boolean);

    const product = db.createProduct({
      sellerId: currentUser.id,
      categoryId: newProduct.categoryId,
      title: newProduct.title,
      titleRu: newProduct.titleRu || newProduct.title,
      titleZh: newProduct.titleZh || newProduct.title,
      description: newProduct.description || newProduct.title,
      descriptionRu: newProduct.descriptionRu || newProduct.titleRu || newProduct.title,
      descriptionZh: newProduct.descriptionZh || newProduct.description || newProduct.titleZh || newProduct.title,
      priceRub,
      priceUsd,
      formatType: newProduct.formatType,
      delimiter: newProduct.delimiter,
      tags,
      tagsRu: tagsRu.length ? tagsRu : tags,
      tagsZh: tagsZh.length ? tagsZh : tags,
      imageUrl: newProductImageDataUrl || undefined,
      isActive: false,
      moderationStatus: 'PENDING',
      requiresVideo: false,
      warrantyDays: parseInt(newProduct.warrantyDays) || 24,
    });

    // Add bulk prices
    product.bulkPrices = [
      { id: crypto.randomUUID(), productId: product.id, minQty: 5, maxQty: 19, priceRub: Math.round(priceRub * 0.9), priceUsd: priceUsd * 0.9 },
      { id: crypto.randomUUID(), productId: product.id, minQty: 20, maxQty: 49, priceRub: Math.round(priceRub * 0.8), priceUsd: priceUsd * 0.8 },
      { id: crypto.randomUUID(), productId: product.id, minQty: 50, maxQty: 999999, priceRub: Math.round(priceRub * 0.7), priceUsd: priceUsd * 0.7 },
    ];

    toast.success(
      language === 'ru'
        ? 'Товар создан и отправлен на модерацию'
        : language === 'zh'
          ? '商品已创建并提交审核'
          : 'Product created and submitted for moderation'
    );
    setShowAddProduct(false);
    setNewProduct({
      title: '',
      titleRu: '',
      titleZh: '',
      description: '',
      descriptionRu: '',
      descriptionZh: '',
      categoryId: '',
      priceUsd: '',
      formatType: 'SINGLE_LINE',
      delimiter: ':',
      tags: '',
      tagsRu: '',
      tagsZh: '',
      warrantyDays: '24',
    });
    setNewProductImageDataUrl('');
    loadProducts();
    refreshProducts();
  };

  const handleUploadStock = () => {
    if (!selectedProduct || !stockData.trim()) {
      toast.error(language === 'ru' ? 'Введите данные' : language === 'zh' ? '输入数据' : 'Enter data');
      return;
    }

    const lines = stockData.trim().split('\n').filter(line => line.trim());
    let added = 0;
    let duplicates = 0;

    for (const line of lines) {
      if (db.checkDuplicate(line)) {
        duplicates++;
        continue;
      }
      db.createStockItem({
        productId: selectedProduct.id,
        dataContent: line,
        isSold: false,
        isReserved: false,
      });
      added++;
    }

    toast.success(`${language === 'ru' ? 'Добавлено' : language === 'zh' ? '已添加' : 'Added'}: ${added}, ${language === 'ru' ? 'Дубликатов' : language === 'zh' ? '重复' : 'Duplicates'}: ${duplicates}`);
    setShowUploadStock(false);
    setStockData('');
    setSelectedProduct(null);
    loadProducts();
    refreshProducts();
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm(language === 'ru' ? 'Удалить товар?' : language === 'zh' ? '删除商品?' : 'Delete product?')) {
      db.deleteProduct(productId);
      loadProducts();
      refreshProducts();
      toast.success(language === 'ru' ? 'Товар удален' : language === 'zh' ? '商品已删除' : 'Product deleted');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditProduct({
      id: product.id,
      title: product.title,
      titleRu: product.titleRu,
      titleZh: product.titleZh,
      description: product.description,
      descriptionRu: product.descriptionRu,
      descriptionZh: product.descriptionZh,
      categoryId: product.categoryId,
      priceUsd: String(product.priceUsd),
      tags: product.tags.join(', '),
      tagsRu: product.tagsRu.join(', '),
      tagsZh: product.tagsZh.join(', '),
      warrantyDays: String(product.warrantyDays ?? 24),
    });
    setEditProductImageDataUrl(product.imageUrl || '');
    setShowEditProduct(true);
  };

  const handleSaveProductEdit = () => {
    if (!editProduct.id || !editProduct.title || !editProduct.categoryId || !editProduct.priceUsd) {
      toast.error(language === 'ru' ? 'Заполните обязательные поля' : language === 'zh' ? '请填写必填字段' : 'Fill required fields');
      return;
    }

    const priceUsd = parseFloat(editProduct.priceUsd);
    if (Number.isNaN(priceUsd) || priceUsd <= 0) {
      toast.error(language === 'ru' ? 'Некорректная цена' : language === 'zh' ? '价格无效' : 'Invalid price');
      return;
    }

    const tags = editProduct.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const tagsRu = editProduct.tagsRu.split(',').map((t) => t.trim()).filter(Boolean);
    const tagsZh = editProduct.tagsZh.split(',').map((t) => t.trim()).filter(Boolean);

    db.updateProduct(editProduct.id, {
      title: editProduct.title,
      titleRu: editProduct.titleRu || editProduct.title,
      titleZh: editProduct.titleZh || editProduct.title,
      description: editProduct.description || editProduct.title,
      descriptionRu: editProduct.descriptionRu || editProduct.description || editProduct.titleRu || editProduct.title,
      descriptionZh: editProduct.descriptionZh || editProduct.description || editProduct.titleZh || editProduct.title,
      categoryId: editProduct.categoryId,
      priceUsd,
      priceRub: Math.round(priceUsd * 92),
      tags,
      tagsRu: tagsRu.length ? tagsRu : tags,
      tagsZh: tagsZh.length ? tagsZh : tags,
      imageUrl: editProductImageDataUrl || undefined,
      warrantyDays: parseInt(editProduct.warrantyDays || '24', 10),
    });

    setShowEditProduct(false);
    toast.success(language === 'ru' ? 'Товар обновлен' : language === 'zh' ? '商品已更新' : 'Product updated');
    loadProducts();
    refreshProducts();
  };

  const handleRemoveStock = (product: Product) => {
    const qtyRaw = window.prompt(
      language === 'ru'
        ? 'Сколько единиц удалить из стока?'
        : language === 'zh'
          ? '要从库存删除多少条？'
          : 'How many stock items should be removed?'
    );
    if (!qtyRaw) return;
    const qty = parseInt(qtyRaw, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error(language === 'ru' ? 'Введите корректное количество' : language === 'zh' ? '请输入有效数量' : 'Enter a valid quantity');
      return;
    }

    const stockToRemove = db.getStockByProduct(product.id).slice(0, qty);
    if (stockToRemove.length === 0) {
      toast.error(language === 'ru' ? 'Нет доступного стока для списания' : language === 'zh' ? '没有可扣减库存' : 'No available stock to remove');
      return;
    }

    const removedLines = stockToRemove.map((s) => s.dataContent);
    const removed = db.removeStockByProduct(product.id, stockToRemove.length);

    // Auto-download removed stock lines as a file
    const blob = new Blob([removedLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product.title.replace(/\s+/g, '_').toLowerCase()}_removed_stock_${removed}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(
      `${language === 'ru' ? 'Удалено и скачано' : language === 'zh' ? '已删除并下载' : 'Removed and downloaded'}: ${removed}`
    );
    loadProducts();
    refreshProducts();
  };

  const handleDownloadStock = (product: Product) => {
    const stockLines = db.getStockByProduct(product.id).map((s) => s.dataContent);
    const blob = new Blob([stockLines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product.title.replace(/\s+/g, '_').toLowerCase()}_stock.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleWithdraw = () => {
    if (!currentUser) return;
    if (currentUser.balanceRub < 500) {
      toast.error(language === 'ru' ? 'Минимум 500 RUB' : language === 'zh' ? '最低 500 RUB' : 'Minimum 500 RUB');
      return;
    }
    setCurrentView('SELLER_WITHDRAW');
  };

  if (!currentUser || currentUser.role !== 'SELLER') {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>
              {language === 'ru' ? 'Доступ запрещен' : language === 'zh' ? '访问被拒绝' : 'Access Denied'}
            </CardTitle>
            <CardDescription>
              {language === 'ru' ? 'Только для продавцов' : language === 'zh' ? '仅限卖家' : 'Sellers only'}
            </CardDescription>
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

  if (currentUser.sellerModerationStatus === 'PENDING') {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>
              {language === 'ru' ? 'Аккаунт на модерации' : language === 'zh' ? '账号审核中' : 'Account in moderation'}
            </CardTitle>
            <CardDescription>
              {language === 'ru'
                ? 'Ваша заявка продавца ожидает проверки администратором.'
                : language === 'zh'
                  ? '您的卖家申请正在等待管理员审核。'
                  : 'Your seller account is waiting for admin review.'}
            </CardDescription>
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

  if (currentUser.sellerModerationStatus === 'REJECTED') {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>
              {language === 'ru' ? 'Заявка отклонена' : language === 'zh' ? '申请被拒绝' : 'Request rejected'}
            </CardTitle>
            <CardDescription>
              {currentUser.sellerModerationReason ||
                (language === 'ru'
                  ? 'Администратор отклонил заявку продавца.'
                  : language === 'zh'
                    ? '管理员已拒绝卖家申请。'
                    : 'Admin has rejected the seller account request.')}
            </CardDescription>
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

  const categories = db.getAllCategories();

  return (
    <div className="container py-4 md:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setCurrentView('MARKETPLACE')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {language === 'ru' ? 'Панель продавца' : language === 'zh' ? '卖家面板' : 'Seller Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === 'ru' ? 'ID Поставщика' : language === 'zh' ? '供应商ID' : 'Supplier ID'}: {currentUser.supplierId}
            </p>
            {currentUser.storeName && (
              <p className="text-sm text-muted-foreground">
                {language === 'ru' ? 'Магазин' : language === 'zh' ? '店铺' : 'Store'}: {currentUser.storeName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border border-border/60 overflow-hidden bg-muted/40 flex items-center justify-center">
              {currentUser.storeLogoUrl ? (
                <img src={currentUser.storeLogoUrl} alt="Store logo" className="h-full w-full object-cover" />
              ) : (
                <Package className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <Label className="text-xs text-muted-foreground cursor-pointer underline underline-offset-2">
              {isStoreLogoUploading
                ? (language === 'ru' ? 'Загрузка...' : language === 'zh' ? '上传中...' : 'Uploading...')
                : (language === 'ru' ? 'Логотип магазина' : language === 'zh' ? '店铺 Logo' : 'Store logo')}
              <Input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isStoreLogoUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  void handleStoreLogoSelect(file);
                  e.currentTarget.value = '';
                }}
              />
            </Label>

            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">{currentUser.reputation.toFixed(1)}%</span>
              <Badge variant="outline" className={insuranceMeta.className}>
                <Shield className="w-3 h-3 mr-1" />
                {insuranceMeta.label}
              </Badge>
            </div>
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
                  <p className="font-bold">{formatPriceRub(currentUser.balanceRub, language)}</p>
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
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Страховка' : language === 'zh' ? '保险金' : 'Insurance'}</p>
                  <p className="font-bold">{formatPriceRub(insuranceBalance, language)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Продажи' : language === 'zh' ? '销售' : 'Sales'}</p>
                  <p className="font-bold">{formatPriceRub(totalSales, language)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Package className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Товары' : language === 'zh' ? '商品' : 'Products'}</p>
                  <p className="font-bold">{totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'В наличии' : language === 'zh' ? '库存' : 'In Stock'}</p>
                  <p className="font-bold">{totalStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'На модерации' : language === 'zh' ? '审核中' : 'Under Review'}</p>
                  <p className="font-bold">{pendingProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Обзор' : language === 'zh' ? '概览' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Товары' : language === 'zh' ? '商品' : 'Products'}
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingBag className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Заказы' : language === 'zh' ? '订单' : 'Orders'}
            </TabsTrigger>
            <TabsTrigger value="finance">
              <Wallet className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Финансы' : language === 'zh' ? '财务' : 'Finance'}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ru' ? 'Быстрые действия' : language === 'zh' ? '快速操作' : 'Quick Actions'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" onClick={() => { setActiveTab('products'); setShowAddProduct(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {language === 'ru' ? 'Добавить товар' : language === 'zh' ? '添加商品' : 'Add Product'}
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('products')}>
                    <Upload className="w-4 h-4 mr-2" />
                    {language === 'ru' ? 'Загрузить сток' : language === 'zh' ? '上传库存' : 'Upload Stock'}
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={handleWithdraw}>
                    <TrendingDown className="w-4 h-4 mr-2" />
                    {language === 'ru' ? 'Вывести средства' : language === 'zh' ? '提现' : 'Withdraw'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ru' ? 'Статистика' : language === 'zh' ? '统计' : 'Statistics'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Всего заказов' : language === 'zh' ? '总订单' : 'Total Orders'}</span>
                    <span className="font-medium">{totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Репутация' : language === 'zh' ? '信誉' : 'Reputation'}</span>
                    <span className="font-medium">{currentUser.reputation.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Положительных отзывов' : language === 'zh' ? '正面评价' : 'Positive Reviews'}</span>
                    <span className="font-medium text-green-500">+{currentUser.positiveVotes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Отрицательных отзывов' : language === 'zh' ? '负面评价' : 'Negative Reviews'}</span>
                    <span className="font-medium text-red-500">-{currentUser.negativeVotes}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{language === 'ru' ? 'Мои товары' : language === 'zh' ? '我的商品' : 'My Products'}</CardTitle>
                  <CardDescription>{totalProducts} {language === 'ru' ? 'товаров' : language === 'zh' ? '商品' : 'products'}</CardDescription>
                </div>
                <Button onClick={() => setShowAddProduct(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {language === 'ru' ? 'Добавить' : language === 'zh' ? '添加' : 'Add'}
                </Button>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{language === 'ru' ? 'Нет товаров' : language === 'zh' ? '没有商品' : 'No products yet'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product) => (
                      <div key={product.id} className="border rounded-lg p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1 flex items-start gap-3">
                            <div className="h-12 w-12 rounded-md border border-border/60 overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                              ) : (
                                <ImagePlus className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{getProductTitleByLanguage(product)}</h4>
                                <Badge variant="outline" className={getModerationBadge(product.moderationStatus).cls}>
                                  {getModerationBadge(product.moderationStatus).label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{getCategoryNameByLanguage(product.category)}</p>
                              {product.moderationReason && (
                                <p className="text-xs text-muted-foreground mt-1">{product.moderationReason}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm">{formatPriceRub(product.priceRub, language)}</span>
                                <Badge variant="secondary">{language === 'ru' ? 'В наличии' : language === 'zh' ? '库存' : 'Stock'}: {product.stockCount || 0}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              {language === 'ru' ? 'Редакт.' : language === 'zh' ? '编辑' : 'Edit'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => { setSelectedProduct(product); setShowUploadStock(true); }}
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              {language === 'ru' ? 'Сток' : language === 'zh' ? '库存' : 'Stock'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveStock(product)}
                            >
                              {language === 'ru' ? 'Списать' : language === 'zh' ? '扣减' : 'Remove'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadStock(product)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              {language === 'ru' ? 'Скачать' : language === 'zh' ? '下载' : 'Download'}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ru' ? 'Заказы покупателей' : language === 'zh' ? '买家订单' : 'Customer Orders'}</CardTitle>
              </CardHeader>
              <CardContent>
                {sellerOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{language === 'ru' ? 'Нет заказов' : language === 'zh' ? '没有订单' : 'No orders yet'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sellerOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">#{order.id.slice(0, 8)}</span>
                          <Badge variant={order.paymentStatus === 'CONFIRMED' ? 'default' : 'secondary'}>
                            {order.paymentStatus}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{formatDate(order.createdAt, language)}</p>
                        <div className="mt-2">
                          {order.items?.filter(item => {
                            const product = db.getProductById(item.productId);
                            return product?.sellerId === currentUser?.id;
                          }).map(item => (
                            <p key={item.id} className="text-sm">
                              {(() => {
                                const p = db.getProductById(item.productId);
                                if (!p) return '';
                                return getProductTitleByLanguage(p);
                              })()} x{item.quantity}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ru' ? 'Баланс' : language === 'zh' ? '余额' : 'Balance'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-lg text-center">
                    <p className="text-3xl font-bold">{formatPriceRub(currentUser.balanceRub, language)}</p>
                    <p className="text-sm text-muted-foreground">≈ {formatPriceUsd(currentUser.balanceUsd, language)}</p>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {language === 'ru' ? 'Уровень страховки' : language === 'zh' ? '保险等级' : 'Insurance Level'}
                      </span>
                      <Badge variant="outline" className={insuranceMeta.className}>
                        <Shield className="w-3 h-3 mr-1" />
                        {insuranceMeta.label}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {language === 'ru' ? 'Страховой баланс' : language === 'zh' ? '保险余额' : 'Insurance Balance'}
                      </span>
                      <span className="font-medium">{formatPriceRub(insuranceBalance, language)}</span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {nextInsuranceTarget
                        ? language === 'ru'
                          ? `До уровня ${nextInsuranceTarget === 10000 ? 'L1' : nextInsuranceTarget === 5000 ? 'L2' : 'L3'} осталось ${formatPriceRub(amountToNextLevel, language)}`
                          : language === 'zh'
                            ? `距离升级到${nextInsuranceTarget === 10000 ? 'L1' : nextInsuranceTarget === 5000 ? 'L2' : 'L3'}还需 ${formatPriceRub(amountToNextLevel, language)}`
                            : `${formatPriceRub(amountToNextLevel, language)} to reach ${nextInsuranceTarget === 10000 ? 'L1' : nextInsuranceTarget === 5000 ? 'L2' : 'L3'}`
                        : language === 'ru'
                          ? 'Максимальный страховой уровень достигнут'
                          : language === 'zh'
                            ? '已达到最高保险等级'
                            : 'Maximum insurance level reached'}
                    </p>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={insuranceAmountRub}
                        onChange={(e) => setInsuranceAmountRub(e.target.value)}
                        placeholder="1000"
                      />
                      <Button onClick={handleDepositInsurance}>
                        <Shield className="w-4 h-4 mr-1" />
                        {language === 'ru' ? 'Пополнить' : language === 'zh' ? '充值' : 'Deposit'}
                      </Button>
                    </div>
                  </div>

                  <Button className="w-full" onClick={handleWithdraw}>
                    <TrendingDown className="w-4 h-4 mr-2" />
                    {language === 'ru' ? 'Вывести' : language === 'zh' ? '提现' : 'Withdraw'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ru' ? 'История' : language === 'zh' ? '历史' : 'History'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {cryptoTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">{language === 'ru' ? 'Нет транзакций' : language === 'zh' ? '没有交易' : 'No transactions'}</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cryptoTransactions.map((tx) => (
                        <div key={tx.id} className="flex justify-between items-center p-2 bg-muted rounded">
                          <div>
                            <Badge variant="outline">{tx.type}</Badge>
                            <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt, language)}</p>
                          </div>
                          <span className={tx.type === 'DEPOSIT' ? 'text-green-500' : 'text-orange-500'}>
                            {tx.type === 'DEPOSIT' ? '+' : '-'}{formatPriceRub(tx.amountRub, language)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Product Dialog */}
        <Dialog
          open={showAddProduct}
          onOpenChange={(open) => {
            setShowAddProduct(open);
            if (!open) {
              setNewProductImageDataUrl('');
            }
          }}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{language === 'ru' ? 'Добавить товар' : language === 'zh' ? '添加商品' : 'Add Product'}</DialogTitle>
              <DialogDescription>{language === 'ru' ? 'Заполните информацию о товаре' : language === 'zh' ? '填写商品信息' : 'Fill in product information'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{language === 'ru' ? 'Название (EN)' : language === 'zh' ? '名称 (EN)' : 'Title (EN)'}</Label>
                <Input value={newProduct.title} onChange={(e) => setNewProduct({...newProduct, title: e.target.value})} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Название (RU)' : language === 'zh' ? '名称 (RU)' : 'Title (RU)'}</Label>
                <Input value={newProduct.titleRu} onChange={(e) => setNewProduct({...newProduct, titleRu: e.target.value})} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Название (ZH)' : language === 'zh' ? '名称 (ZH)' : 'Title (ZH)'}</Label>
                <Input value={newProduct.titleZh} onChange={(e) => setNewProduct({...newProduct, titleZh: e.target.value})} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Описание (EN)' : language === 'zh' ? '描述 (EN)' : 'Description (EN)'}</Label>
                <Textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Описание (RU)' : language === 'zh' ? '描述 (RU)' : 'Description (RU)'}</Label>
                <Textarea value={newProduct.descriptionRu} onChange={(e) => setNewProduct({ ...newProduct, descriptionRu: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Описание (ZH)' : language === 'zh' ? '描述 (ZH)' : 'Description (ZH)'}</Label>
                <Textarea value={newProduct.descriptionZh} onChange={(e) => setNewProduct({ ...newProduct, descriptionZh: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Категория' : language === 'zh' ? '类别' : 'Category'}</Label>
                <Select value={newProduct.categoryId} onValueChange={(v) => setNewProduct({...newProduct, categoryId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ru' ? 'Выберите' : language === 'zh' ? '选择' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{language === 'ru' ? cat.nameRu : cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'ru' ? 'Цена (USD)' : language === 'zh' ? '价格 (USD)' : 'Price (USD)'}</Label>
                <Input type="number" step="0.01" value={newProduct.priceUsd} onChange={(e) => setNewProduct({...newProduct, priceUsd: e.target.value})} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Изображение товара' : language === 'zh' ? '商品图片' : 'Product Image'}</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    void handleNewProductImageSelect(file);
                    e.currentTarget.value = '';
                  }}
                />
                {newProductImageDataUrl && (
                  <div className="mt-2 space-y-2">
                    <img src={newProductImageDataUrl} alt="New product" className="h-24 w-24 rounded-md border object-cover" />
                    <Button type="button" variant="outline" size="sm" onClick={() => setNewProductImageDataUrl('')}>
                      {language === 'ru' ? 'Удалить изображение' : language === 'zh' ? '移除图片' : 'Remove image'}
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label>{language === 'ru' ? 'Теги (через запятую)' : language === 'zh' ? '标签 (逗号分隔)' : 'Tags (comma separated)'}</Label>
                <Input value={newProduct.tags} onChange={(e) => setNewProduct({...newProduct, tags: e.target.value})} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Теги (RU)' : language === 'zh' ? '标签 (RU)' : 'Tags (RU)'}</Label>
                <Input value={newProduct.tagsRu} onChange={(e) => setNewProduct({ ...newProduct, tagsRu: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Теги (ZH)' : language === 'zh' ? '标签 (ZH)' : 'Tags (ZH)'}</Label>
                <Input value={newProduct.tagsZh} onChange={(e) => setNewProduct({ ...newProduct, tagsZh: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Гарантия (часов)' : language === 'zh' ? '保修 (小时)' : 'Warranty (hours)'}</Label>
                <Input type="number" value={newProduct.warrantyDays} onChange={(e) => setNewProduct({...newProduct, warrantyDays: e.target.value})} />
              </div>
              <Button className="w-full" onClick={handleCreateProduct}>
                {language === 'ru' ? 'Создать' : language === 'zh' ? '创建' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upload Stock Dialog */}
        <Dialog open={showUploadStock} onOpenChange={setShowUploadStock}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{language === 'ru' ? 'Загрузить сток' : language === 'zh' ? '上传库存' : 'Upload Stock'}</DialogTitle>
              <DialogDescription>
                {selectedProduct ? (language === 'ru' ? selectedProduct.titleRu : selectedProduct.title) : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{language === 'ru' ? 'Данные (по одной на строку)' : language === 'zh' ? '数据 (每行一个)' : 'Data (one per line)'}</Label>
                <Textarea 
                  value={stockData} 
                  onChange={(e) => setStockData(e.target.value)}
                  placeholder="login:pass&#10;login:pass:email&#10;cookie_data"
                  className="min-h-[200px] font-mono"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowUploadStock(false)}>
                  {language === 'ru' ? 'Отмена' : language === 'zh' ? '取消' : 'Cancel'}
                </Button>
                <Button className="flex-1" onClick={handleUploadStock}>
                  <Upload className="w-4 h-4 mr-2" />
                  {language === 'ru' ? 'Загрузить' : language === 'zh' ? '上传' : 'Upload'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog
          open={showEditProduct}
          onOpenChange={(open) => {
            setShowEditProduct(open);
            if (!open) {
              setEditProductImageDataUrl('');
            }
          }}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{language === 'ru' ? 'Редактировать товар' : language === 'zh' ? '编辑商品' : 'Edit Product'}</DialogTitle>
              <DialogDescription>
                {language === 'ru' ? 'Измените поля товара' : language === 'zh' ? '修改商品信息' : 'Update product fields'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{language === 'ru' ? 'Название (EN)' : language === 'zh' ? '名称 (EN)' : 'Title (EN)'}</Label>
                <Input value={editProduct.title} onChange={(e) => setEditProduct({ ...editProduct, title: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Название (RU)' : language === 'zh' ? '名称 (RU)' : 'Title (RU)'}</Label>
                <Input value={editProduct.titleRu} onChange={(e) => setEditProduct({ ...editProduct, titleRu: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Название (ZH)' : language === 'zh' ? '名称 (ZH)' : 'Title (ZH)'}</Label>
                <Input value={editProduct.titleZh} onChange={(e) => setEditProduct({ ...editProduct, titleZh: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Категория' : language === 'zh' ? '类别' : 'Category'}</Label>
                <Select value={editProduct.categoryId} onValueChange={(v) => setEditProduct({ ...editProduct, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ru' ? 'Выберите' : language === 'zh' ? '选择' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{language === 'ru' ? cat.nameRu : cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'ru' ? 'Описание (EN)' : language === 'zh' ? '描述 (EN)' : 'Description (EN)'}</Label>
                <Textarea value={editProduct.description} onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Описание (RU)' : language === 'zh' ? '描述 (RU)' : 'Description (RU)'}</Label>
                <Textarea value={editProduct.descriptionRu} onChange={(e) => setEditProduct({ ...editProduct, descriptionRu: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Описание (ZH)' : language === 'zh' ? '描述 (ZH)' : 'Description (ZH)'}</Label>
                <Textarea value={editProduct.descriptionZh} onChange={(e) => setEditProduct({ ...editProduct, descriptionZh: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Цена (USD)' : language === 'zh' ? '价格 (USD)' : 'Price (USD)'}</Label>
                <Input type="number" step="0.01" value={editProduct.priceUsd} onChange={(e) => setEditProduct({ ...editProduct, priceUsd: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Изображение товара' : language === 'zh' ? '商品图片' : 'Product Image'}</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    void handleEditProductImageSelect(file);
                    e.currentTarget.value = '';
                  }}
                />
                {editProductImageDataUrl && (
                  <div className="mt-2 space-y-2">
                    <img src={editProductImageDataUrl} alt="Edit product" className="h-24 w-24 rounded-md border object-cover" />
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditProductImageDataUrl('')}>
                      {language === 'ru' ? 'Удалить изображение' : language === 'zh' ? '移除图片' : 'Remove image'}
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label>{language === 'ru' ? 'Теги (EN)' : language === 'zh' ? '标签 (EN)' : 'Tags (EN)'}</Label>
                <Input value={editProduct.tags} onChange={(e) => setEditProduct({ ...editProduct, tags: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Теги (RU)' : language === 'zh' ? '标签 (RU)' : 'Tags (RU)'}</Label>
                <Input value={editProduct.tagsRu} onChange={(e) => setEditProduct({ ...editProduct, tagsRu: e.target.value })} />
              </div>
              <div>
                <Label>{language === 'ru' ? 'Теги (ZH)' : language === 'zh' ? '标签 (ZH)' : 'Tags (ZH)'}</Label>
                <Input value={editProduct.tagsZh} onChange={(e) => setEditProduct({ ...editProduct, tagsZh: e.target.value })} />
              </div>
              <Button className="w-full" onClick={handleSaveProductEdit}>
                {language === 'ru' ? 'Сохранить изменения' : language === 'zh' ? '保存更改' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
