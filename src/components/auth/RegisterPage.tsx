import { useState, type FormEvent } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, User, Mail, Lock, Phone, Globe, MapPin, AlertCircle, Loader2, Check, X } from 'lucide-react';

interface RegisterPageProps {
  onNavigate: (view: string) => void;
}

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'Spain', 'Italy', 'Netherlands', 'Brazil', 'India', 'Japan', 'South Korea',
  'Mexico', 'Russia', 'China', 'United Arab Emirates', 'Singapore', 'Other',
];

export function RegisterPage({ onNavigate }: RegisterPageProps) {
  const { register, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', username: '', email: '', phone: '',
    password: '', confirmPassword: '', country: '', city: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (pwd: string): number => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd)) score++;
    return Math.min(score, 5);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const getStrengthLabel = (score: number) => {
    if (score <= 1) return { text: 'Very Weak', color: 'text-red-500', bg: 'bg-red-500' };
    if (score === 2) return { text: 'Weak', color: 'text-orange-500', bg: 'bg-orange-500' };
    if (score === 3) return { text: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-500' };
    if (score === 4) return { text: 'Strong', color: 'text-green-500', bg: 'bg-green-500' };
    return { text: 'Very Strong', color: 'text-emerald-500', bg: 'bg-emerald-500' };
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required.';
    if (!formData.username.trim() || formData.username.trim().length < 3) errors.username = 'Username must be at least 3 characters.';
    else if (!/^[a-zA-Z0-9_-]{3,30}$/.test(formData.username.trim())) errors.username = 'Only letters, numbers, hyphens, underscores.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Valid email required.';
    if (!formData.phone.trim() || formData.phone.trim().length < 7) errors.phone = 'Valid phone number required.';
    if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    else if (passwordStrength < 3) errors.password = 'Password is too weak. Include uppercase, lowercase, number, and special character.';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (!formData.country) errors.country = 'Country is required.';
    if (!termsAccepted) errors.termsAccepted = 'You must accept Terms & Conditions.';
    if (!privacyAccepted) errors.privacyAccepted = 'You must accept Privacy Policy.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validateForm()) return;

    await register({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      username: formData.username.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      country: formData.country,
      city: formData.city.trim() || undefined,
      termsAccepted,
      privacyAccepted,
    });
  };

  const strength = getStrengthLabel(passwordStrength);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
          <p className="text-muted-foreground mt-2">Fill in your details to get started</p>
        </div>

        <Card className="border-muted/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Register</CardTitle>
            <CardDescription>All fields marked with * are required</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Personal Information */}
              <div>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="firstName" placeholder="John" className="pl-10" value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} disabled={isLoading} />
                    </div>
                    {fieldErrors.firstName && <p className="text-xs text-destructive">{fieldErrors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" placeholder="Doe" value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} disabled={isLoading} />
                    {fieldErrors.lastName && <p className="text-xs text-destructive">{fieldErrors.lastName}</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="username" placeholder="johndoe" className="pl-10" value={formData.username} onChange={(e) => updateField('username', e.target.value)} disabled={isLoading} />
                  </div>
                  {fieldErrors.username && <p className="text-xs text-destructive">{fieldErrors.username}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-email" type="email" placeholder="john@example.com" className="pl-10" value={formData.email} onChange={(e) => updateField('email', e.target.value)} disabled={isLoading} />
                  </div>
                  {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" className="pl-10" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} disabled={isLoading} />
                  </div>
                  {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      id="country"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City (Optional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="city" placeholder="New York" className="pl-10" value={formData.city} onChange={(e) => updateField('city', e.target.value)} disabled={isLoading} />
                </div>
              </div>

              {/* Security */}
              <div>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Security</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pl-10 pr-10" value={formData.password} onChange={(e) => updateField('password', e.target.value)} disabled={isLoading} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div key={level} className={`h-1 flex-1 rounded-full ${level <= passwordStrength ? strength.bg : 'bg-gray-200 dark:bg-gray-700'}`} />
                          ))}
                        </div>
                        <p className={`text-xs ${strength.color}`}>{strength.text}</p>
                      </div>
                    )}
                    {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" className="pl-10 pr-10" value={formData.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} disabled={isLoading} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox id="termsAccepted" checked={termsAccepted} onCheckedChange={(c) => { setTermsAccepted(c as boolean); setFieldErrors((p) => ({ ...p, termsAccepted: '' })); }} disabled={isLoading} />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="termsAccepted" className="text-sm cursor-pointer">
                      I accept the{' '}
                      <button type="button" className="text-primary hover:underline" onClick={() => window.open('/terms', '_blank')}>Terms & Conditions</button>
                    </Label>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox id="privacyAccepted" checked={privacyAccepted} onCheckedChange={(c) => { setPrivacyAccepted(c as boolean); setFieldErrors((p) => ({ ...p, privacyAccepted: '' })); }} disabled={isLoading} />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="privacyAccepted" className="text-sm cursor-pointer">
                      I accept the{' '}
                      <button type="button" className="text-primary hover:underline" onClick={() => window.open('/privacy', '_blank')}>Privacy Policy</button>
                    </Label>
                  </div>
                </div>
                {(fieldErrors.termsAccepted || fieldErrors.privacyAccepted) && (
                  <p className="text-xs text-destructive">{fieldErrors.termsAccepted || fieldErrors.privacyAccepted}</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-0">
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button type="button" onClick={() => onNavigate('login')} className="text-primary hover:underline font-medium">Sign in</button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}