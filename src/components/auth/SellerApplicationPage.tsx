import { useState, type FormEvent } from 'react';
import { useAuthStore } from '@/store/authStore';
import { sellerApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Store, User, Mail, Phone, Globe, MapPin, Home, Hash, FileText, AlertCircle, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

interface SellerApplicationPageProps {
  onNavigate: (view: string) => void;
}

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'Spain', 'Italy', 'Netherlands', 'Brazil', 'India', 'Japan', 'South Korea',
  'Mexico', 'Russia', 'China', 'United Arab Emirates', 'Singapore', 'Other',
];

const PRODUCT_CATEGORIES = [
  'Electronics', 'Fashion & Clothing', 'Home & Garden', 'Sports & Outdoors',
  'Books & Media', 'Toys & Games', 'Health & Beauty', 'Food & Beverages',
  'Automotive', 'Office Supplies', 'Pet Supplies', 'Jewelry & Accessories',
  'Art & Crafts', 'Music Instruments', 'Software & Digital', 'Other',
];

export function SellerApplicationPage({ onNavigate }: SellerApplicationPageProps) {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submittedApp, setSubmittedApp] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullLegalName: '',
    storeName: '',
    phone: user?.phone || '',
    email: user?.email || '',
    country: user?.country || '',
    stateProvince: '',
    city: user?.city || '',
    fullAddress: '',
    postalCode: '',
    storeDescription: '',
    productCategories: [] as string[],
  });
  const [termsAccepted, setTermsAccepted] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toggleCategory = (category: string) => {
    setFormData((prev) => {
      const cats = prev.productCategories.includes(category)
        ? prev.productCategories.filter((c) => c !== category)
        : [...prev.productCategories, category];
      return { ...prev, productCategories: cats };
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.fullLegalName.trim()) errors.fullLegalName = 'Full legal name is required.';
    if (!formData.storeName.trim()) errors.storeName = 'Store name is required.';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required.';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Valid email is required.';
    if (!formData.country) errors.country = 'Country is required.';
    if (!formData.stateProvince.trim()) errors.stateProvince = 'State/Province is required.';
    if (!formData.city.trim()) errors.city = 'City is required.';
    if (!formData.fullAddress.trim()) errors.fullAddress = 'Full address is required.';
    if (!formData.postalCode.trim()) errors.postalCode = 'Postal code is required.';
    if (!formData.storeDescription.trim()) errors.storeDescription = 'Store description is required.';
    else if (formData.storeDescription.trim().length < 20) errors.storeDescription = 'Please provide a more detailed description (at least 20 characters).';
    if (formData.productCategories.length === 0) errors.productCategories = 'Select at least one product category.';
    if (!termsAccepted) errors.termsAccepted = 'You must accept the seller terms.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;

    setIsLoading(true);
    const { data, error: submitError, code } = await sellerApi.apply({
      ...formData,
      productCategories: JSON.stringify(formData.productCategories),
      termsAccepted,
    });
    setIsLoading(false);

    if (submitError) {
      if (code === 'APPLICATION_EXISTS') {
        setSuccess(true);
        setSubmittedApp(data?.application);
        return;
      }
      setError(submitError);
    } else {
      setSuccess(true);
      setSubmittedApp(data?.application);
    }
  };

  if (success) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
          <p className="text-muted-foreground">
            Your seller application has been submitted and is pending review.
          </p>
          {submittedApp && (
            <div className="mt-4 inline-block">
              <Badge variant="secondary" className="text-sm">
                Status: {submittedApp.status}
              </Badge>
            </div>
          )}
        </div>
        <div className="text-center">
          <Button onClick={() => onNavigate('dashboard')} className="mr-2">
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={() => onNavigate('marketplace')}>
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Dashboard
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Seller Application</h1>
        <p className="text-muted-foreground mt-2">Fill out the form below to apply as a seller on our platform</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-muted/50 shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Business Information
            </CardTitle>
            <CardDescription>Tell us about you and your business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Legal Name *</Label>
                <Input placeholder="John Michael Doe" value={formData.fullLegalName} onChange={(e) => updateField('fullLegalName', e.target.value)} disabled={isLoading} />
                {fieldErrors.fullLegalName && <p className="text-xs text-destructive">{fieldErrors.fullLegalName}</p>}
              </div>
              <div className="space-y-2">
                <Label>Store Name *</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="My Awesome Store" value={formData.storeName} onChange={(e) => updateField('storeName', e.target.value)} disabled={isLoading} />
                </div>
                {fieldErrors.storeName && <p className="text-xs text-destructive">{fieldErrors.storeName}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/50 shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>How customers and administrators can reach you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" type="tel" placeholder="+1 (555) 123-4567" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} disabled={isLoading} />
                </div>
                {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" type="email" placeholder="store@example.com" value={formData.email} onChange={(e) => updateField('email', e.target.value)} disabled={isLoading} />
                </div>
                {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/50 shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address Information
            </CardTitle>
            <CardDescription>Your business location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country *</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="">Select country...</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {fieldErrors.country && <p className="text-xs text-destructive">{fieldErrors.country}</p>}
              </div>
              <div className="space-y-2">
                <Label>State/Province *</Label>
                <Input placeholder="California" value={formData.stateProvince} onChange={(e) => updateField('stateProvince', e.target.value)} disabled={isLoading} />
                {fieldErrors.stateProvince && <p className="text-xs text-destructive">{fieldErrors.stateProvince}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="Los Angeles" value={formData.city} onChange={(e) => updateField('city', e.target.value)} disabled={isLoading} />
                </div>
                {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
              </div>
              <div className="space-y-2">
                <Label>Postal Code *</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="90210" value={formData.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} disabled={isLoading} />
                </div>
                {fieldErrors.postalCode && <p className="text-xs text-destructive">{fieldErrors.postalCode}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Full Address *</Label>
              <div className="relative">
                <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea className="pl-10 min-h-[60px]" placeholder="123 Main Street, Apt 4B" value={formData.fullAddress} onChange={(e) => updateField('fullAddress', e.target.value)} disabled={isLoading} />
              </div>
              {fieldErrors.fullAddress && <p className="text-xs text-destructive">{fieldErrors.fullAddress}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/50 shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Store Details
            </CardTitle>
            <CardDescription>Describe your store and what you plan to sell</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Store Description *</Label>
              <Textarea
                placeholder="Describe your store, what makes it unique, and what customers can expect..."
                className="min-h-[120px]"
                value={formData.storeDescription}
                onChange={(e) => updateField('storeDescription', e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">{formData.storeDescription.length} / 1000 characters</p>
              {fieldErrors.storeDescription && <p className="text-xs text-destructive">{fieldErrors.storeDescription}</p>}
            </div>

            <div className="space-y-2">
              <Label>Product Categories *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRODUCT_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    disabled={isLoading}
                    className={`text-sm px-3 py-2 rounded-md border transition-colors text-left ${
                      formData.productCategories.includes(category)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted hover:border-muted-foreground/50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {fieldErrors.productCategories && <p className="text-xs text-destructive">{fieldErrors.productCategories}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/50 shadow-lg mb-6">
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="seller-terms"
                  checked={termsAccepted}
                  onCheckedChange={(c) => { setTermsAccepted(c as boolean); setFieldErrors((p) => ({ ...p, termsAccepted: '' })); }}
                  disabled={isLoading}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="seller-terms" className="text-sm cursor-pointer">
                    I agree to the Seller Terms of Service, including marketplace fees, product listing policies, and dispute resolution procedures. I confirm that all information provided is accurate and truthful.
                  </Label>
                </div>
              </div>
              {fieldErrors.termsAccepted && <p className="text-xs text-destructive">{fieldErrors.termsAccepted}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button type="submit" size="lg" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => onNavigate('dashboard')} disabled={isLoading}>
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}