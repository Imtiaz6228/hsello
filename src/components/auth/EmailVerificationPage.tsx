import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, AlertCircle, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

interface EmailVerificationPageProps {
  onNavigate: (view: string) => void;
  token?: string;
}

export function EmailVerificationPage({ onNavigate, token: initialToken }: EmailVerificationPageProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [token] = useState(initialToken || new URLSearchParams(window.location.search).get('token') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (token && !success) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    setIsLoading(true);
    setError(null);
    const result = await authApi.verifyEmail(token);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    const result = await authApi.resendVerification();
    setIsResending(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(false);
      setError(null);
    }
  };

  // Already verified view
  if (user?.emailVerifiedAt) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Email Verified</h1>
          <p className="text-muted-foreground mb-6">Your email has been verified. You have full access to your account.</p>
          <Button onClick={() => onNavigate('dashboard')} className="w-full">Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Success after verifying via token
  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
          <p className="text-muted-foreground mb-6">Your email has been successfully verified. You now have full access to your account.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => onNavigate('dashboard')} className="w-full">Go to Dashboard</Button>
            <Button variant="outline" onClick={() => onNavigate('login')} className="w-full">Sign In</Button>
          </div>
        </div>
      </div>
    );
  }

  // Verification in progress via token
  if (token && isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
          <h1 className="text-2xl font-bold mb-2">Verifying your email...</h1>
          <p className="text-muted-foreground">Please wait while we verify your email address.</p>
        </div>
      </div>
    );
  }

  // Token error view
  if (token && error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-muted/50 shadow-lg">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-center">Verification Failed</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            {isAuthenticated && (
              <Button onClick={handleResend} className="w-full" disabled={isResending}>
                {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Resend Verification Email
              </Button>
            )}
            <Button variant="outline" onClick={() => onNavigate('login')} className="w-full">Back to Sign In</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Prompt to verify (user is logged in but not verified)
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Verify Your Email</h1>
          <p className="text-muted-foreground mt-2">We sent a verification link to your email address</p>
        </div>

        <Card className="border-muted/50 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle>Check your inbox</CardTitle>
            <CardDescription>
              {user?.email ? (
                <>We sent a verification email to <strong>{user.email}</strong>. Click the link in the email to verify your account.</>
              ) : (
                'Please check your email and click the verification link to activate your account.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Didn't receive the email? Check your spam folder or request a new one.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={handleResend} className="w-full" variant="outline" disabled={isResending}>
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>
            <button onClick={() => onNavigate('dashboard')} className="text-sm text-muted-foreground hover:text-foreground">
              Skip for now
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}