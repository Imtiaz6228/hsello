import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { userApi, sellerApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User, Mail, Phone, Globe, MapPin, Shield, Calendar, Clock,
  AlertCircle, Loader2, CheckCircle, Edit3, Camera, Key, Store, ArrowRight,
  LogOut, Settings
} from 'lucide-react';

interface UserDashboardPageProps {
  onNavigate: (view: string) => void;
}

export function UserDashboardPage({ onNavigate }: UserDashboardPageProps) {
  const { user, logout, refreshUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile editing
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '', lastName: '', username: '', phone: '', country: '', city: '',
  });

  // Password change
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Seller application
  const [sellerApp, setSellerApp] = useState<any>(null);
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    loadSellerApplication();
  }, []);

  const loadSellerApplication = async () => {
    setAppLoading(true);
    const { data } = await userApi.getDashboard();
    if (data?.sellerApplication) {
      setSellerApp(data.sellerApplication);
    }
    setAppLoading(false);
  };

  const startEditing = () => {
    if (!user) return;
    setEditData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      phone: user.phone || '',
      country: user.country || '',
      city: user.city || '',
    });
    setIsEditing(true);
  };

  const handleProfileUpdate = async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: updateError } = await userApi.updateProfile(editData);
    if (updateError) {
      setError(updateError);
    } else {
      setSuccess('Profile updated successfully.');
      setIsEditing(false);
      await refreshUser();
      setTimeout(() => setSuccess(null), 3000);
    }
    setIsLoading(false);
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setPasswordError('Both fields are required.');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    const { data, error: pwError } = await userApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
    setIsLoading(false);

    if (pwError) {
      setPasswordError(pwError);
    } else {
      setPasswordSuccess('Password changed successfully. You will be logged out.');
      setPasswordData({ currentPassword: '', newPassword: '' });
      setTimeout(() => logout(), 2000);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }

    setIsLoading(true);
    const result = await userApi.uploadProfilePicture(file);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Profile picture updated.');
      await refreshUser();
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const getInitials = () => {
    if (!user) return '?';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="container py-8 text-center">
        <p>Please sign in to view your dashboard.</p>
        <Button onClick={() => onNavigate('login')} className="mt-4">Sign In</Button>
      </div>
    );
  }

  const profileImageUrl = user.profileImageUrl ? `http://localhost:3000${user.profileImageUrl}` : null;

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.firstName}!</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onNavigate('marketplace')}>
            Marketplace
          </Button>
          <Button variant="ghost" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4 border-green-500/50 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" />Security</TabsTrigger>
          <TabsTrigger value="seller"><Store className="mr-2 h-4 w-4" />Become a Seller</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card className="lg:col-span-1">
              <CardContent className="pt-6 text-center">
                <div className="relative inline-block">
                  <Avatar className="w-24 h-24 mx-auto">
                    {profileImageUrl ? (
                      <AvatarImage src={profileImageUrl} alt={user.firstName} />
                    ) : null}
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors">
                    <Camera className="h-4 w-4" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleProfilePictureUpload} disabled={isLoading} />
                  </label>
                </div>
                <h2 className="text-xl font-bold mt-4">{user.firstName} {user.lastName}</h2>
                <p className="text-muted-foreground">@{user.username}</p>
                <Badge className="mt-2" variant="secondary">
                  {user.role === 'ADMIN' ? 'Administrator' : user.role === 'SELLER' ? 'Seller' : 'Customer'}
                </Badge>
                {!user.emailVerifiedAt && (
                  <div className="mt-3">
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600/50">
                      Email not verified
                    </Badge>
                    <button
                      onClick={() => onNavigate('verify-email')}
                      className="text-xs text-primary hover:underline block mt-1 mx-auto"
                    >
                      Verify now
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Your account details</CardDescription>
                  </div>
                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={startEditing}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input value={editData.firstName} onChange={(e) => setEditData((p) => ({ ...p, firstName: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input value={editData.lastName} onChange={(e) => setEditData((p) => ({ ...p, lastName: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input value={editData.username} onChange={(e) => setEditData((p) => ({ ...p, username: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={editData.phone} onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <Input value={editData.country} onChange={(e) => setEditData((p) => ({ ...p, country: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input value={editData.city} onChange={(e) => setEditData((p) => ({ ...p, city: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleProfileUpdate} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 py-2 border-b">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 py-2 border-b">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{user.phone || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 py-2 border-b">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Country</p>
                        <p className="font-medium">{user.country || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 py-2 border-b">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">City</p>
                        <p className="font-medium">{user.city || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 py-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Member since</p>
                        <p className="font-medium">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}
              {passwordSuccess && (
                <Alert className="border-green-500/50 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{passwordSuccess}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handlePasswordChange} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                Change Password
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Seller Tab */}
        <TabsContent value="seller">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Seller Application
              </CardTitle>
              <CardDescription>
                Apply to become a seller and start selling your products on our platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">Loading...</p>
                </div>
              ) : sellerApp ? (
                <div>
                  <div className="rounded-lg border p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{sellerApp.storeName}</h3>
                        <p className="text-sm text-muted-foreground">Application #{sellerApp.id.slice(0, 8)}</p>
                      </div>
                      <Badge variant={
                        sellerApp.status === 'APPROVED' ? 'default' :
                        sellerApp.status === 'REJECTED' ? 'destructive' : 'secondary'
                      }>
                        {sellerApp.status}
                      </Badge>
                    </div>
                    {sellerApp.status === 'REJECTED' && sellerApp.reviewNote && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Review note: {sellerApp.reviewNote}</AlertDescription>
                      </Alert>
                    )}
                    {sellerApp.status === 'APPROVED' && (
                      <Alert className="border-green-500/50 text-green-600 mt-4">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>Your application has been approved! You can now access the seller dashboard.</AlertDescription>
                      </Alert>
                    )}
                    <p className="text-xs text-muted-foreground mt-4">
                      Submitted on {formatDate(sellerApp.createdAt)}
                      {sellerApp.reviewedAt && ` • Reviewed on ${formatDate(sellerApp.reviewedAt)}`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Store className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to start selling?</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Apply to become a seller and list your products on our marketplace.
                  </p>
                  <Button size="lg" onClick={() => onNavigate('seller-apply')}>
                    Apply Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}