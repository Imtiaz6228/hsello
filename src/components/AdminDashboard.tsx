import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, ShoppingBag, Package, FolderTree,
  Tag, Star, MessageSquare, Settings, Shield, FileText,
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, Search,
  Ban, CheckCircle, XCircle, Eye, Edit, Trash2, AlertTriangle,
  Bell, Clock, CreditCard, BarChart3, Activity, LogOut, Store,
  ArrowUpRight, ArrowDownRight, UserCheck, UserX, X, RefreshCw, 
  TicketIcon, FileSpreadsheet, Download, Plus,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

type AdminTab = 'dashboard' | 'users' | 'seller-applications' | 'stores' | 'products' | 'orders' | 'categories' | 'coupons' | 'reviews' | 'tickets' | 'withdrawals' | 'settings' | 'audit-logs';

interface DashboardData {
  stats: any;
  recentOrders: any[];
  recentUsers: any[];
  ordersByStatus: any[];
  monthlyRevenueData: any[];
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-500/10 text-red-600 border-red-500/30',
  ADMIN: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  MODERATOR: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  SELLER: 'bg-green-500/10 text-green-600 border-green-500/30',
  CUSTOMER: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-600',
  APPROVED: 'bg-green-500/10 text-green-600',
  REJECTED: 'bg-red-500/10 text-red-600',
  ACTIVE: 'bg-green-500/10 text-green-600',
  INACTIVE: 'bg-gray-500/10 text-gray-600',
  COMPLETED: 'bg-green-500/10 text-green-600',
  CANCELLED: 'bg-red-500/10 text-red-600',
  REFUNDED: 'bg-orange-500/10 text-orange-600',
  PROCESSING: 'bg-blue-500/10 text-blue-600',
  SHIPPED: 'bg-purple-500/10 text-purple-600',
  DELIVERED: 'bg-emerald-500/10 text-emerald-600',
  OPEN: 'bg-yellow-500/10 text-yellow-600',
  CLOSED: 'bg-gray-500/10 text-gray-600',
  RESOLVED: 'bg-green-500/10 text-green-600',
  FEATURED: 'bg-purple-500/10 text-purple-600',
  HIDDEN: 'bg-gray-500/10 text-gray-600',
};

export function AdminDashboard() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Lists
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [sellerApps, setSellerApps] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [sellerAppFilter, setSellerAppFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [orderFilter, setOrderFilter] = useState('all');

  // Dialogs
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [banAction, setBanAction] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAppId, setReviewAppId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketReply, setTicketReply] = useState('');

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const canManageSecurity = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const canModerate = isAdmin;

  const loadDashboard = useCallback(async () => {
    const { data } = await adminApi.getDashboard();
    if (data) setDashboardData(data);
  }, []);

  const loadUsers = useCallback(async () => {
    const { data } = await adminApi.getUsers({
      search: userSearch || undefined,
      role: userRoleFilter !== 'all' ? userRoleFilter : undefined,
    });
    if (data) { setUsers(data.users); setUsersTotal(data.total); }
  }, [userSearch, userRoleFilter]);

  const loadSellerApps = useCallback(async () => {
    const { data } = await adminApi.getSellerApplications({
      status: sellerAppFilter !== 'all' ? sellerAppFilter : undefined,
    });
    if (data) setSellerApps(data.applications);
  }, [sellerAppFilter]);

  const loadStores = useCallback(async () => {
    const { data } = await adminApi.getStores();
    if (data) setStores(data.stores);
  }, []);

  const loadProducts = useCallback(async () => {
    const { data } = await adminApi.getProducts({
      status: productFilter !== 'all' ? productFilter : undefined,
      search: productSearch || undefined,
    });
    if (data) setProducts(data.products);
  }, [productFilter, productSearch]);

  const loadOrders = useCallback(async () => {
    const { data } = await adminApi.getOrders({
      status: orderFilter !== 'all' ? orderFilter : undefined,
    });
    if (data) setOrders(data.orders);
  }, [orderFilter]);

  const loadCategories = useCallback(async () => {
    const { data } = await adminApi.getCategories();
    if (data) setCategories(data.categories);
  }, []);

  const loadCoupons = useCallback(async () => {
    const { data } = await adminApi.getCoupons();
    if (data) setCoupons(data.coupons);
  }, []);

  const loadReviews = useCallback(async () => {
    const { data } = await adminApi.getReviews();
    if (data) setReviews(data.reviews);
  }, []);

  const loadTickets = useCallback(async () => {
    const { data } = await adminApi.getTickets();
    if (data) setTickets(data.tickets);
  }, []);

  const loadWithdrawals = useCallback(async () => {
    const { data } = await adminApi.getWithdrawals();
    if (data) setWithdrawals(data.withdrawals);
  }, []);

  const loadSettings = useCallback(async () => {
    const { data } = await adminApi.getSettings();
    if (data) setSettings(data.settings);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    const { data } = await adminApi.getAuditLogs();
    if (data) setAuditLogs(data.logs);
  }, []);

  const loadNotifications = useCallback(async () => {
    const { data } = await adminApi.getNotifications();
    if (data) { setNotifications(data.notifications); setUnreadCount(data.unreadCount); }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([
      loadDashboard(), loadUsers(), loadSellerApps(), loadStores(),
      loadProducts(), loadOrders(), loadCategories(), loadCoupons(),
      loadReviews(), loadTickets(), loadWithdrawals(), loadSettings(),
      loadAuditLogs(), loadNotifications(),
    ]).finally(() => setLoading(false));
  }, [isAdmin]);

  // Refresh on tab change
  useEffect(() => {
    if (!isAdmin) return;
    switch (activeTab) {
      case 'dashboard': loadDashboard(); break;
      case 'users': loadUsers(); break;
      case 'seller-applications': loadSellerApps(); break;
      case 'stores': loadStores(); break;
      case 'products': loadProducts(); break;
      case 'orders': loadOrders(); break;
      case 'categories': loadCategories(); break;
      case 'coupons': loadCoupons(); break;
      case 'reviews': loadReviews(); break;
      case 'tickets': loadTickets(); break;
      case 'withdrawals': loadWithdrawals(); break;
      case 'settings': loadSettings(); break;
      case 'audit-logs': loadAuditLogs(); break;
    }
    loadNotifications();
  }, [activeTab]);

  const handleBanUser = async () => {
    if (!banUserId) return;
    const { data, error } = await adminApi.updateUser(banUserId, { isBanned: banAction });
    if (error) { toast.error(error); return; }
    toast.success(banAction ? 'User banned successfully' : 'User unbanned successfully');
    setShowBanDialog(false);
    loadUsers();
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !newPassword) return;
    const { error } = await adminApi.resetUserPassword(resetUserId, newPassword);
    if (error) { toast.error(error); return; }
    toast.success('Password reset successfully');
    setShowResetDialog(false);
    setNewPassword('');
  };

  const handleReviewApp = async () => {
    if (!reviewAppId) return;
    const { error } = await adminApi.reviewSellerApplication(reviewAppId, reviewAction, reviewNote);
    if (error) { toast.error(error); return; }
    toast.success(`Application ${reviewAction.toLowerCase()}`);
    setShowReviewDialog(false);
    setReviewNote('');
    loadSellerApps();
    loadDashboard();
  };

  const handleUpdateProduct = async (id: string, updates: any) => {
    const { error } = await adminApi.updateProduct(id, updates);
    if (error) { toast.error(error); return; }
    toast.success('Product updated');
    loadProducts();
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await adminApi.deleteProduct(id);
    if (error) { toast.error(error); return; }
    toast.success('Product deleted');
    loadProducts();
  };

  const handleUpdateOrder = async (id: string, status: string) => {
    const { error } = await adminApi.updateOrder(id, { status });
    if (error) { toast.error(error); return; }
    toast.success('Order updated');
    loadOrders();
    loadDashboard();
  };

  const handleReviewAction = async (id: string, status: string) => {
    const { error } = await adminApi.updateReview(id, status);
    if (error) { toast.error(error); return; }
    toast.success('Review updated');
    loadReviews();
  };

  const handleUpdateTicket = async (id: string, status: string) => {
    const { error } = await adminApi.updateTicket(id, { status });
    if (error) { toast.error(error); return; }
    toast.success('Ticket updated');
    loadTickets();
  };

  const handleReplyTicket = async () => {
    if (!selectedTicket || !ticketReply.trim()) return;
    const { error } = await adminApi.replyTicket(selectedTicket.id, ticketReply);
    if (error) { toast.error(error); return; }
    toast.success('Reply sent');
    setTicketReply('');
    loadTickets();
  };

  const handleSaveCategory = async () => {
    if (!editingCat) return;
    const { name, slug } = editingCat;
    if (!name || !slug) { toast.error('Name and slug are required'); return; }
    if (editingCat.id) {
      await adminApi.updateCategory(editingCat.id, editingCat);
    } else {
      await adminApi.createCategory(editingCat);
    }
    toast.success(editingCat.id ? 'Category updated' : 'Category created');
    setShowCatDialog(false);
    setEditingCat(null);
    loadCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await adminApi.deleteCategory(id);
    if (error) { toast.error(error); return; }
    toast.success('Category deleted');
    loadCategories();
  };

  const handleSaveCoupon = async () => {
    if (!editingCoupon?.code) { toast.error('Code is required'); return; }
    if (editingCoupon.id) {
      await adminApi.updateCoupon(editingCoupon.id, editingCoupon);
    } else {
      await adminApi.createCoupon(editingCoupon);
    }
    toast.success(editingCoupon.id ? 'Coupon updated' : 'Coupon created');
    setShowCouponDialog(false);
    setEditingCoupon(null);
    loadCoupons();
  };

  const handleDeleteCoupon = async (id: string) => {
    await adminApi.deleteCoupon(id);
    toast.success('Coupon deleted');
    loadCoupons();
  };

  const handleSaveSettings = async () => {
    const { error } = await adminApi.updateSettings(settings);
    if (error) { toast.error(error); return; }
    toast.success('Settings saved');
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this area.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const d = dashboardData?.stats;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">{user?.role} — {user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative" onClick={() => {}}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 min-h-[calc(100vh-4rem)] border-r bg-background p-4 gap-1">
          {[
            { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: LayoutDashboard },
            { id: 'users' as AdminTab, label: 'Users', icon: Users, badge: d?.totalUsers },
            { id: 'seller-applications' as AdminTab, label: 'Sellers', icon: Store, badge: d?.pendingSellerApplications },
            { id: 'products' as AdminTab, label: 'Products', icon: Package, badge: d?.pendingProducts },
            { id: 'orders' as AdminTab, label: 'Orders', icon: ShoppingBag, badge: d?.pendingOrders },
            { id: 'categories' as AdminTab, label: 'Categories', icon: FolderTree },
            { id: 'coupons' as AdminTab, label: 'Coupons', icon: Tag },
            { id: 'reviews' as AdminTab, label: 'Reviews', icon: Star },
            { id: 'tickets' as AdminTab, label: 'Tickets', icon: MessageSquare },
            { id: 'withdrawals' as AdminTab, label: 'Withdrawals', icon: CreditCard },
            { id: 'settings' as AdminTab, label: 'Settings', icon: Settings },
            { id: 'audit-logs' as AdminTab, label: 'Audit Logs', icon: FileText },
          ].map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? 'secondary' : 'ghost'}
              className="justify-start gap-3"
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{item.badge}</Badge>
              )}
            </Button>
          ))}
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden w-full border-b bg-background overflow-x-auto">
          <div className="flex gap-1 p-2">
            {['dashboard', 'users', 'sellers', 'products', 'orders', 'more'].map((k) => (
              <Button
                key={k}
                variant={activeTab === k ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(k === 'sellers' ? 'seller-applications' : k as AdminTab)}
              >
                {k}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {/* ═══ DASHBOARD ═══ */}
          {activeTab === 'dashboard' && d && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg"><DollarSign className="w-5 h-5 text-green-500" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                        <p className="font-bold text-sm">${d.totalRevenue.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-500" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Today</p>
                        <p className="font-bold text-sm">${d.todayRevenue.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg"><ShoppingBag className="w-5 h-5 text-purple-500" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Orders</p>
                        <p className="font-bold text-sm">{d.totalOrders}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/10 rounded-lg"><Users className="w-5 h-5 text-orange-500" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Customers</p>
                        <p className="font-bold text-sm">{d.totalCustomers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg"><Store className="w-5 h-5 text-emerald-500" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vendors</p>
                        <p className="font-bold text-sm">{d.totalVendors}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pending</p>
                        <p className="font-bold text-sm">{d.pendingOrders}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Revenue (12 Months)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dashboardData?.monthlyRevenueData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis fontSize={12} />
                        <ReTooltip />
                        <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Orders by Status</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={dashboardData?.ordersByStatus || []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                          {(dashboardData?.ordersByStatus || []).map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <ReTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Recent orders */}
              <Card>
                <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left"><th className="p-2">ID</th><th className="p-2">Customer</th><th className="p-2">Amount</th><th className="p-2">Status</th><th className="p-2">Date</th></tr></thead>
                      <tbody>
                        {(dashboardData?.recentOrders || []).map((o: any) => (
                          <tr key={o.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-mono text-xs">{o.id.slice(0, 8)}</td>
                            <td className="p-2">{o.user?.email}</td>
                            <td className="p-2">${o.totalAmount?.toFixed(2)}</td>
                            <td className="p-2"><Badge variant="outline" className={statusColors[o.status] || ''}>{o.status}</Badge></td>
                            <td className="p-2 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ USERS ═══ */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <h2 className="text-xl font-bold">Users ({usersTotal})</h2>
                <div className="flex gap-2">
                  <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-48" />
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="All Roles" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MODERATOR">Moderator</SelectItem>
                      <SelectItem value="SELLER">Seller</SelectItem>
                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={loadUsers}><RefreshCw className="w-4 h-4" /></Button>
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left bg-muted/50"><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Email Verified</th><th className="p-3">Joined</th><th className="p-3">Actions</th></tr></thead>
                      <tbody>
                        {users.map((u: any) => (
                          <tr key={u.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">
                              <div className="font-medium">{u.firstName} {u.lastName}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </td>
                            <td className="p-3"><Badge variant="outline" className={roleColors[u.role] || ''}>{u.role}</Badge></td>
                            <td className="p-3">{u.isBanned ? <Badge variant="destructive">Banned</Badge> : <Badge variant="outline" className="bg-green-500/10 text-green-600">Active</Badge>}</td>
                            <td className="p-3">{u.emailVerifiedAt ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-yellow-500" />}</td>
                            <td className="p-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" title="View" onClick={() => { setSelectedUser(u); setShowUserDialog(true); }}><Eye className="w-4 h-4" /></Button>
                                {canManageSecurity && (
                                  <>
                                    <Button variant="ghost" size="icon" title={u.isBanned ? 'Unban' : 'Ban'} onClick={() => { setBanUserId(u.id); setBanAction(!u.isBanned); setShowBanDialog(true); }}>
                                      {u.isBanned ? <UserCheck className="w-4 h-4 text-green-500" /> : <Ban className="w-4 h-4 text-red-500" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" title="Reset Password" onClick={() => { setResetUserId(u.id); setShowResetDialog(true); }}>
                                      <RefreshCw className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ SELLER APPLICATIONS ═══ */}
          {activeTab === 'seller-applications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Seller Applications</h2>
                <div className="flex gap-2">
                  <Select value={sellerAppFilter} onValueChange={setSellerAppFilter}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4">
                {sellerApps.map((app: any) => (
                  <Card key={app.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold">{app.storeName}</h3>
                          <p className="text-sm text-muted-foreground">{app.fullLegalName} — {app.email}</p>
                          <p className="text-xs text-muted-foreground">{app.city}, {app.stateProvince}, {app.country}</p>
                          <Badge variant="outline" className={`mt-1 ${statusColors[app.status] || ''}`}>{app.status}</Badge>
                        </div>
                        <div className="flex gap-2">
                          {app.status === 'PENDING' && canModerate && (
                            <>
                              <Button size="sm" onClick={() => { setReviewAppId(app.id); setReviewAction('APPROVED'); setShowReviewDialog(true); }}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => { setReviewAppId(app.id); setReviewAction('REJECTED'); setShowReviewDialog(true); }}>
                                <XCircle className="w-4 h-4 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ═══ PRODUCTS ═══ */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <h2 className="text-xl font-bold">Products</h2>
                <div className="flex gap-2">
                  <Input placeholder="Search..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="w-48" />
                  <Select value={productFilter} onValueChange={setProductFilter}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="HIDDEN">Hidden</SelectItem>
                      <SelectItem value="FEATURED">Featured</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left bg-muted/50"><th className="p-3">Product</th><th className="p-3">Store</th><th className="p-3">Price</th><th className="p-3">Status</th><th className="p-3">Featured</th><th className="p-3">Actions</th></tr></thead>
                      <tbody>
                        {products.map((p: any) => (
                          <tr key={p.id} className="border-b hover:bg-muted/30">
                            <td className="p-3">
                              <div className="font-medium">{p.title}</div>
                              <div className="text-xs text-muted-foreground">{p.category?.name}</div>
                            </td>
                            <td className="p-3 text-muted-foreground">{p.store?.storeName}</td>
                            <td className="p-3">${p.price?.toFixed(2)}</td>
                            <td className="p-3"><Badge variant="outline" className={statusColors[p.status] || ''}>{p.status}</Badge></td>
                            <td className="p-3">{p.isFeatured ? <CheckCircle className="w-4 h-4 text-purple-500" /> : <XCircle className="w-4 h-4 text-gray-400" />}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                {p.status === 'PENDING' && canModerate && (
                                  <Button size="sm" variant="ghost" onClick={() => handleUpdateProduct(p.id, { status: 'APPROVED' })}>
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  </Button>
                                )}
                                {p.status !== 'FEATURED' && canModerate && (
                                  <Button size="sm" variant="ghost" onClick={() => handleUpdateProduct(p.id, { status: 'FEATURED', isFeatured: true })}>
                                    <Star className="w-4 h-4 text-purple-500" />
                                  </Button>
                                )}
                                {canManageSecurity && (
                                  <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(p.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ ORDERS ═══ */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Orders</h2>
                <Select value={orderFilter} onValueChange={setOrderFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="PACKED">Packed</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left bg-muted/50"><th className="p-3">Order ID</th><th className="p-3">Customer</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3">Actions</th></tr></thead>
                      <tbody>
                        {orders.map((o: any) => (
                          <tr key={o.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                            <td className="p-3">{o.user?.email}</td>
                            <td className="p-3">${o.totalAmount?.toFixed(2)}</td>
                            <td className="p-3"><Badge variant="outline" className={statusColors[o.status] || ''}>{o.status}</Badge></td>
                            <td className="p-3 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                            <td className="p-3">
                              <Select value={o.status} onValueChange={(v) => handleUpdateOrder(o.id, v)}>
                                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PENDING">Pending</SelectItem>
                                  <SelectItem value="PROCESSING">Processing</SelectItem>
                                  <SelectItem value="PACKED">Packed</SelectItem>
                                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                                  <SelectItem value="COMPLETED">Completed</SelectItem>
                                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ CATEGORIES ═══ */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Categories</h2>
                <Button size="sm" onClick={() => { setEditingCat({ name: '', nameRu: '', nameZh: '', slug: '', icon: 'FolderTree', description: '', sortOrder: 0 }); setShowCatDialog(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Add Category
                </Button>
              </div>
              <div className="grid gap-3">
                {categories.map((c: any) => (
                  <Card key={c.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          <Badge variant="outline">{c.isActive ? 'Active' : 'Inactive'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Slug: {c.slug} | Products: {c._count?.products || 0} | Children: {c._count?.children || 0}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingCat(c); setShowCatDialog(true); }}><Edit className="w-4 h-4" /></Button>
                        {canManageSecurity && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(c.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ═══ COUPONS ═══ */}
          {activeTab === 'coupons' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Coupons</h2>
                <Button size="sm" onClick={() => { setEditingCoupon({ code: '', discountPercent: 0, discountFixed: 0, isActive: true }); setShowCouponDialog(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Add Coupon
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left bg-muted/50"><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Used</th><th className="p-3">Active</th><th className="p-3">Actions</th></tr></thead>
                    <tbody>
                      {coupons.map((c: any) => (
                        <tr key={c.id} className="border-b">
                          <td className="p-3 font-mono font-bold">{c.code}</td>
                          <td className="p-3">{c.discountPercent > 0 ? `${c.discountPercent}%` : `$${c.discountFixed}`}</td>
                          <td className="p-3">{c.usedCount}/{c.maxUses || '∞'}</td>
                          <td className="p-3">{c.isActive ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-400" />}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingCoupon(c); setShowCouponDialog(true); }}><Edit className="w-4 h-4" /></Button>
                              {canManageSecurity && (
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteCoupon(c.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ REVIEWS ═══ */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Reviews</h2>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left bg-muted/50"><th className="p-3">User</th><th className="p-3">Product</th><th className="p-3">Rating</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                      <tbody>
                        {reviews.map((r: any) => (
                          <tr key={r.id} className="border-b">
                            <td className="p-3">{r.user?.email}</td>
                            <td className="p-3">{r.product?.title}</td>
                            <td className="p-3">{'⭐'.repeat(r.rating)}</td>
                            <td className="p-3"><Badge variant="outline" className={statusColors[r.status] || ''}>{r.status}</Badge></td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                {r.status !== 'APPROVED' && <Button size="sm" variant="ghost" onClick={() => handleReviewAction(r.id, 'APPROVED')}><CheckCircle className="w-4 h-4 text-green-500" /></Button>}
                                {r.status !== 'REJECTED' && <Button size="sm" variant="ghost" onClick={() => handleReviewAction(r.id, 'REJECTED')}><XCircle className="w-4 h-4 text-red-500" /></Button>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ TICKETS ═══ */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Support Tickets</h2>
              <div className="grid gap-4">
                {tickets.map((t: any) => (
                  <Card key={t.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{t.subject}</span>
                            <Badge variant="outline" className={statusColors[t.status] || ''}>{t.status}</Badge>
                            <Badge variant="outline">{t.priority}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{t.user?.email} — {new Date(t.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedTicket(t); setShowTicketDialog(true); loadTickets(); }}>
                            <MessageSquare className="w-4 h-4 mr-1" /> View
                          </Button>
                          <Select value={t.status} onValueChange={(v) => handleUpdateTicket(t.id, v)}>
                            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OPEN">Open</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="RESOLVED">Resolved</SelectItem>
                              <SelectItem value="CLOSED">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ═══ WITHDRAWALS ═══ */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Withdrawals</h2>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left bg-muted/50"><th className="p-3">ID</th><th className="p-3">User</th><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
                    <tbody>
                      {withdrawals.map((w: any) => (
                        <tr key={w.id} className="border-b">
                          <td className="p-3 font-mono text-xs">{w.id.slice(0, 8)}</td>
                          <td className="p-3">{w.userId}</td>
                          <td className="p-3">${w.amount?.toFixed(2)}</td>
                          <td className="p-3">{w.method}</td>
                          <td className="p-3"><Badge variant="outline" className={statusColors[w.status] || ''}>{w.status}</Badge></td>
                          <td className="p-3 text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Settings</h2>
                <Button onClick={handleSaveSettings}>Save Settings</Button>
              </div>
              <Card>
                <CardContent className="p-6 space-y-4">
                  {Object.entries(settings).map(([key, value]) => (
                    <div key={key}>
                      <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                      <Input
                        value={value}
                        onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ AUDIT LOGS ═══ */}
          {activeTab === 'audit-logs' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Audit Logs</h2>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left bg-muted/50"><th className="p-3">Action</th><th className="p-3">Actor</th><th className="p-3">Entity</th><th className="p-3">IP</th><th className="p-3">Date</th></tr></thead>
                      <tbody>
                        {auditLogs.map((log: any) => (
                          <tr key={log.id} className="border-b">
                            <td className="p-3"><Badge variant="outline">{log.action}</Badge></td>
                            <td className="p-3">
                              <div className="text-xs">{log.actorEmail}</div>
                              <div className="text-xs text-muted-foreground">{log.actorRole}</div>
                            </td>
                            <td className="p-3 text-xs">{log.entityType} {log.entityId?.slice(0, 8)}</td>
                            <td className="p-3 text-xs text-muted-foreground">{log.ipAddress}</td>
                            <td className="p-3 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* ═══ DIALOGS ═══ */}

      {/* Ban/Unban User */}
      <AlertDialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{banAction ? 'Ban User' : 'Unban User'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {banAction ? 'ban' : 'unban'} this user?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBanUser}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>New Password (min 8 chars)</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
          </div>
          <DialogFooter>
            <Button onClick={handleResetPassword}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Application */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{reviewAction === 'APPROVED' ? 'Approve' : 'Reject'} Application</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Add a review note..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Cancel</Button>
            <Button onClick={handleReviewApp} variant={reviewAction === 'APPROVED' ? 'default' : 'destructive'}>
              {reviewAction === 'APPROVED' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCat?.id ? 'Edit' : 'Add'} Category</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={editingCat?.name || ''} onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })} />
            <Label>Slug *</Label>
            <Input value={editingCat?.slug || ''} onChange={(e) => setEditingCat({ ...editingCat, slug: e.target.value })} />
            <Label>Icon</Label>
            <Input value={editingCat?.icon || ''} onChange={(e) => setEditingCat({ ...editingCat, icon: e.target.value })} />
            <Label>Sort Order</Label>
            <Input type="number" value={editingCat?.sortOrder || 0} onChange={(e) => setEditingCat({ ...editingCat, sortOrder: parseInt(e.target.value) })} />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveCategory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coupon Dialog */}
      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCoupon?.id ? 'Edit' : 'Add'} Coupon</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Code *</Label>
            <Input value={editingCoupon?.code || ''} onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })} />
            <Label>Discount %</Label>
            <Input type="number" value={editingCoupon?.discountPercent || 0} onChange={(e) => setEditingCoupon({ ...editingCoupon, discountPercent: parseFloat(e.target.value) })} />
            <Label>Fixed Discount $</Label>
            <Input type="number" value={editingCoupon?.discountFixed || 0} onChange={(e) => setEditingCoupon({ ...editingCoupon, discountFixed: parseFloat(e.target.value) })} />
            <Label>Max Uses</Label>
            <Input type="number" value={editingCoupon?.maxUses || 0} onChange={(e) => setEditingCoupon({ ...editingCoupon, maxUses: parseInt(e.target.value) })} />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveCoupon}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket View Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
            <DialogDescription>{selectedTicket?.user?.email} — {selectedTicket?.status}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(selectedTicket?.messages || []).map((m: any) => (
              <div key={m.id} className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{m.senderId || 'System'} — {new Date(m.createdAt).toLocaleString()}</p>
                <p className="text-sm mt-1">{m.message}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <Input value={ticketReply} onChange={(e) => setTicketReply(e.target.value)} placeholder="Type a reply..." />
              <Button onClick={handleReplyTicket}>Send</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}