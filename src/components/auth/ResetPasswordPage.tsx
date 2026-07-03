import { useState, type FormEvent } from 'react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle, Loader2, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface ResetPasswordPageProps {
  onNavigate: (view: string) => void;
  token?: string;
}

export function ResetPasswordPage({ onNavigate, token: initialToken }: ResetPasswordPageProps) {
  const [token] = useState(initialToken || new URLSearchParams(window.location.search).get('token') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const getPasswordStrength = (pwd: string): number => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd)) score++;
    return Math.min(score, 5);
  };

  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];
  const strength = getPasswordStrength(password);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!token) errors.token = 'Reset token is missing. Please use the link from your email.';
    if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    else if (getPasswordStrength(password) < 3) errors.password = 'Password is too weak. Include uppercase, lowercase, number, and special character.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;

    setIsLoading(true);
    const result = await authApi.resetPassword({ token, password });
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-muted/50 shadow-lg">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>This password reset link is missing or invalid. Please request a new one.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => onNavigate('forgot-password')} className="w-full">Request New Reset Link</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Password Reset Successful</h1>
          <p className="text-muted-foreground mb-6">Your password has been reset. You can now sign in with your new password.</p>
          <Button onClick={() => onNavigate('login')} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-muted-foreground mt-2">Create a new password for your account</p>
        </div>

        <Card className="border-muted/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">New Password</CardTitle>
            <CardDescription>Choose a strong password that you haven't used before</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="reset-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: '' })); }}
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i < strength ? strengthColors[strength - 1] : 'bg-gray-200 dark:bg-gray-700'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Password strength: {['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength - 1] || 'Weak'}</p>
                  </div>
                )}
                {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
              </div>

              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs font-medium mb-2">Password requirements:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-1">
                    {password.length >= 8 ? <CheckCircle className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 rounded-full border" />}
                    At least 8 characters
                  </li>
                  <li className="flex items-center gap-1">
                    {/[A-Z]/.test(password) ? <CheckCircle className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 rounded-full border" />}
                    One uppercase letter
                  </li>
                  <li className="flex items-center gap-1">
                    {/[a-z]/.test(password) ? <CheckCircle className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 rounded-full border" />}
                    One lowercase letter
                  </li>
                  <li className="flex items-center gap-1">
                    {/\d/.test(password) ? <CheckCircle className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 rounded-full border" />}
                    One number
                  </li>
                  <li className="flex items-center gap-1">
                    {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) ? <CheckCircle className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 rounded-full border" />}
                    One special character
                  </li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-0">
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
              <button type="button" onClick={() => onNavigate('login')} className="text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="inline-block mr-1 h-3 w-3" />
                Back to Sign In
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}