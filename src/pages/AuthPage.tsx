import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, Wallet, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type AuthMode = 'login' | 'signup' | 'forgotPassword';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (mode === 'forgotPassword') {
      const validation = emailSchema.safeParse({ email });
      if (!validation.success) {
        setErrors({ email: validation.error.errors[0]?.message });
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
          return;
        }

        setResetEmailSent(true);
        toast({
          title: 'Check your email',
          description: 'We sent you a password reset link.',
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      validation.error.errors.forEach(err => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = mode === 'login'
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: 'Account exists',
            description: 'This email is already registered. Please sign in.',
            variant: 'destructive',
          });
        } else if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Invalid credentials',
            description: 'Please check your email and password.',
            variant: 'destructive',
          });
        } else {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        return;
      }

      toast({ title: mode === 'login' ? 'Welcome back!' : 'Account created!' });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setResetEmailSent(false);
  };

  // Forgot Password - Email Sent Confirmation
  if (mode === 'forgotPassword' && resetEmailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl card-gradient-purple mx-auto flex items-center justify-center mb-4 shadow-lg">
              <Mail className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
            <p className="text-muted-foreground mt-2">
              We sent a password reset link to <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-card text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <Button
              variant="outline"
              onClick={() => setResetEmailSent(false)}
              className="w-full"
            >
              Try again
            </Button>
          </div>

          <button
            onClick={() => handleModeChange('login')}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // Forgot Password Form
  if (mode === 'forgotPassword') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl card-gradient-purple mx-auto flex items-center justify-center mb-4 shadow-lg">
              <Wallet className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Forgot Password?</h1>
            <p className="text-muted-foreground mt-1">Enter your email to reset your password</p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent/90"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Reset Link
              </Button>
            </form>
          </div>

          <button
            onClick={() => handleModeChange('login')}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // Login / Signup Form
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl card-gradient-purple mx-auto flex items-center justify-center mb-4 shadow-lg">
            <Wallet className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Hisabify</h1>
          <p className="text-muted-foreground mt-1">Track your finances with ease</p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <div className="flex gap-2 p-1 bg-muted rounded-lg mb-6">
            <button
              onClick={() => handleModeChange('login')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'login' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleModeChange('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>


          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('forgotPassword')}
                    className="text-xs text-accent hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => handleModeChange(mode === 'login' ? 'signup' : 'login')}
            className="text-accent font-medium hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
