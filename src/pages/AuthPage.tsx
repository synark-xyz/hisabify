import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Loader2,
  Mail,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { HisabifyLogo } from '@/components/HisabifyLogo';
import { cn } from '@/lib/utils';

// ─── Validation schemas ────────────────────────────────────────────────────────

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ─── Types ─────────────────────────────────────────────────────────────────────

type AuthMode = 'login' | 'signup' | 'forgotPassword';

interface FieldErrors {
  email?: string;
  password?: string;
  privacy?: string;
}

// ─── Password strength helper ──────────────────────────────────────────────────

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (password.length === 0) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#f97316' };
  if (score <= 3) return { score, label: 'Good', color: '#eab308' };
  if (score <= 4) return { score, label: 'Strong', color: '#22c55e' };
  return { score, label: 'Excellent', color: '#10b981' };
}

// ─── Icon components ───────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ─── Ambient background ────────────────────────────────────────────────────────

const MONEY_FLOATERS = [
  { symbol: '$', x: 7,  y: 10, size: 26, delay: 0.0 },
  { symbol: '€', x: 87, y: 18, size: 20, delay: 1.2 },
  { symbol: '₿', x: 14, y: 65, size: 22, delay: 2.1 },
  { symbol: '£', x: 81, y: 70, size: 18, delay: 0.6 },
  { symbol: '$', x: 50, y: 6,  size: 15, delay: 1.8 },
  { symbol: '¥', x: 74, y: 43, size: 24, delay: 3.0 },
  { symbol: '₹', x: 26, y: 38, size: 17, delay: 2.5 },
  { symbol: '$', x: 43, y: 83, size: 21, delay: 0.9 },
  { symbol: '€', x: 62, y: 55, size: 14, delay: 3.6 },
  { symbol: '₿', x: 5,  y: 85, size: 16, delay: 1.5 },
];

const FLOATER_COLORS = ['#F59E0B', '#10B981', '#6366F1'];

function AuthBackground({ shouldReduce }: { shouldReduce: boolean }) {
  return (
    <>
      {/* Fine dot grid */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Diagonal money-note stripe accent */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(245,158,11,0.025) 0px, rgba(245,158,11,0.025) 1px, transparent 1px, transparent 48px)',
        }}
      />

      {/* Floating currency symbols — skipped when user prefers reduced motion */}
      {!shouldReduce &&
        MONEY_FLOATERS.map((f, i) => (
          <motion.span
            key={i}
            className="absolute pointer-events-none select-none font-black"
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              fontSize: f.size,
              color: FLOATER_COLORS[i % 3],
              willChange: 'transform, opacity',
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, i % 2 === 0 ? 7 : -7, 0],
              opacity: [0.07, 0.2, 0.07],
              rotate: [-10, 10, -10],
            }}
            transition={{
              duration: 5 + i * 0.85,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: f.delay,
            }}
          >
            {f.symbol}
          </motion.span>
        ))}

      {/* Ambient orbs — money palette: gold + emerald + indigo */}
      {!shouldReduce && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {/* Gold orb — top right */}
          <motion.div
            className="absolute -top-56 -right-40 w-[480px] h-[480px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(245,158,11,0.20) 0%, transparent 68%)',
              filter: 'blur(64px)',
              willChange: 'transform, opacity',
            }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Emerald orb — mid left */}
          <motion.div
            className="absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(16,185,129,0.16) 0%, transparent 68%)',
              filter: 'blur(64px)',
              willChange: 'transform, opacity',
            }}
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.45, 0.85, 0.45] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          />
          {/* Indigo orb — bottom right */}
          <motion.div
            className="absolute -bottom-48 right-8 w-[360px] h-[360px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 68%)',
              filter: 'blur(64px)',
              willChange: 'transform, opacity',
            }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          />
        </div>
      )}
    </>
  );
}

// ─── OAuth button ──────────────────────────────────────────────────────────────

interface GoogleOAuthButtonProps {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

function GoogleOAuthButton({ loading, disabled, onClick }: GoogleOAuthButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.015, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.975 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'relative w-full flex items-center justify-center gap-2.5 rounded-2xl py-3.5 px-5',
        'text-sm font-semibold transition-shadow duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
        'bg-white text-gray-800',
        'shadow-[0_2px_8px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.12)]',
        'hover:shadow-[0_4px_16px_rgba(0,0,0,0.22),0_2px_4px_rgba(0,0,0,0.14)]',
      )}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
      ) : (
        <GoogleIcon />
      )}
      <span>Continue with Google</span>

      {/* Subtle shimmer on hover */}
      <span
        className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-100"
          style={{
            background:
              'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
          }}
        />
      </span>
    </motion.button>
  );
}

// ─── Floating label input ──────────────────────────────────────────────────────

interface FloatingInputProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  icon: React.ReactNode;
  autoComplete?: string;
  placeholder?: string;
  trailingSlot?: React.ReactNode;
}

function FloatingInput({
  id,
  label,
  type,
  value,
  onChange,
  error,
  icon,
  autoComplete,
  placeholder,
  trailingSlot,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const floated = focused || hasValue;

  return (
    <div className="space-y-1.5">
      <div className="relative group">
        {/* Floating label */}
        <label
          htmlFor={id}
          className={cn(
            'absolute left-10 pointer-events-none select-none z-10',
            'transition-all duration-200 ease-out origin-left',
            'text-white/40',
            floated
              ? 'top-2 text-[10px] font-semibold tracking-wider uppercase text-white/50'
              : 'top-1/2 -translate-y-1/2 text-sm',
          )}
        >
          {label}
        </label>

        {/* Leading icon */}
        <span
          className={cn(
            'absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200',
            focused ? 'text-blue-400' : error ? 'text-red-400/70' : 'text-white/25',
          )}
        >
          {icon}
        </span>

        {/* Input */}
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          placeholder={floated ? placeholder : undefined}
          className={cn(
            'h-14 pl-10 pr-4 pt-5 pb-2',
            'bg-white/[0.06] border-white/[0.1] text-white text-sm',
            'rounded-2xl placeholder:text-white/20',
            'transition-all duration-200',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            trailingSlot && 'pr-12',
            focused && !error && 'bg-white/[0.09] border-blue-500/50',
            focused && !error && 'shadow-[0_0_0_1px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.05)]',
            error &&
              'border-red-500/50 bg-red-500/[0.06] shadow-[0_0_0_1px_rgba(239,68,68,0.3)]',
            !focused && !error && 'hover:bg-white/[0.08] hover:border-white/[0.16]',
          )}
        />

        {/* Trailing slot (e.g. show/hide password) */}
        {trailingSlot && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {trailingSlot}
          </span>
        )}
      </div>

      {/* Error message with shake animation */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4, x: 0 }}
            animate={{ opacity: 1, y: 0, x: [0, -4, 4, -3, 3, 0] }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35, x: { duration: 0.4 } }}
            className="flex items-center gap-1.5 text-xs text-red-400 pl-1"
          >
            <span className="inline-block w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Password strength bar ─────────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="space-y-1.5 px-0.5"
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((step) => (
          <motion.div
            key={step}
            className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/10"
          >
            <motion.div
              className="h-full rounded-full"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: strength.score >= step ? 1 : 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: step * 0.04 }}
              style={{
                backgroundColor: strength.score >= step ? strength.color : 'transparent',
                transformOrigin: 'left',
              }}
            />
          </motion.div>
        ))}
      </div>
      <p className="text-[10px] font-medium" style={{ color: strength.color }}>
        {strength.label}
      </p>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { signIn, signUp, signInWithOAuth, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const shouldReduce = useReducedMotion() ?? false;

  // Ref to prevent redundant navigation
  const navigatingRef = useRef(false);

  useEffect(() => {
    if (user && !navigatingRef.current) {
      navigatingRef.current = true;
      navigate('/');
    }
  }, [user, navigate]);

  const handleModeChange = useCallback(
    (newMode: AuthMode) => {
      setMode(newMode);
      setErrors({});
      setResetEmailSent(false);
      setSubmitSuccess(false);
    },
    [],
  );

  const handleGoogleOAuth = async () => {
    console.log('[AuthPage] Starting Google OAuth flow');
    setOauthLoading('google');
    const { error } = await signInWithOAuth('google');
    if (error) {
      console.error('[AuthPage] Google OAuth failed:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setOauthLoading(null);
    } else {
      console.log('[AuthPage] Google OAuth initiated successfully');
    }
    // On success, the browser redirects to Google — oauthLoading stays set
    // which is fine since the page unloads. If user navigates back without
    // completing auth, clear the loading state.
    setTimeout(() => {
      console.log('[AuthPage] Clearing OAuth loading state');
      setOauthLoading(null);
    }, 5000);
  };

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
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
          return;
        }
        setResetEmailSent(true);
        toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
      } finally {
        setLoading(false);
      }
      return;
    }

    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: FieldErrors = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (mode === 'signup' && !agreePrivacy) {
      setErrors({ privacy: 'You must agree to the Privacy Policy to create an account.' });
      return;
    }

    setLoading(true);
    try {
      const { error } =
        mode === 'login'
          ? await signIn(email, password)
          : await signUp(email, password, agreePrivacy);

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

      // Brief success flash before navigation
      setSubmitSuccess(true);
      if (mode === 'signup') toast({ title: 'Account created!' });
      setTimeout(() => navigate('/'), 400);
    } finally {
      setLoading(false);
    }
  };

  // ── Framer Motion variants ───────────────────────────────────────────────────

  const pageVariants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 16 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: shouldReduce ? 0 : -12 },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 24, scale: shouldReduce ? 1 : 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  const formVariants = {
    hidden: { opacity: 0, x: shouldReduce ? 0 : 8 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: shouldReduce ? 0 : -8 },
  };

  // ── Email sent confirmation view ─────────────────────────────────────────────
  if (mode === 'forgotPassword' && resetEmailSent) {
    return (
      <div
        className="dark relative min-h-screen flex flex-col items-center justify-center px-5 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #07091200 0%, #080c14 40%, #0a0518 100%)' }}
      >
        <AuthBackground shouldReduce={shouldReduce} />

        <motion.div
          className="relative z-10 w-full max-w-sm space-y-5"
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-center space-y-4">
            {/* Animated envelope icon */}
            <motion.div
              className="relative mx-auto w-20 h-20 flex items-center justify-center"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, type: 'spring', stiffness: 200, damping: 18 }}
            >
              <div
                className="absolute inset-0 rounded-[1.25rem]"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                  opacity: 0.15,
                  filter: 'blur(12px)',
                  transform: 'scale(1.3)',
                }}
              />
              <div
                className="relative w-20 h-20 rounded-[1.25rem] flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.15) 100%)',
                  border: '1px solid rgba(139,92,246,0.25)',
                }}
              >
                <Mail className="w-9 h-9 text-purple-400" strokeWidth={1.5} />
              </div>
            </motion.div>

            <div>
              <h1 className="text-2xl font-black text-white">Check your inbox</h1>
              <p className="text-white/45 mt-2 text-sm leading-relaxed">
                We sent a reset link to{' '}
                <span className="font-semibold text-white/75">{email}</span>
              </p>
            </div>
          </div>

          {/* Info card */}
          <div
            className="rounded-3xl p-5 space-y-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-blue-500/[0.08] border border-blue-500/15">
              <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-white/50 leading-relaxed">
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </p>
            </div>

            <button
              onClick={() => setResetEmailSent(false)}
              className={cn(
                'w-full py-3.5 rounded-2xl border border-white/10 text-white/60 text-sm font-semibold',
                'hover:bg-white/[0.05] hover:text-white/90 hover:border-white/20',
                'active:scale-[0.97] transition-all duration-150',
              )}
            >
              Resend email
            </button>
          </div>

          <motion.button
            onClick={() => handleModeChange('login')}
            className="flex items-center justify-center gap-2 text-sm text-white/35 hover:text-white/65 mx-auto transition-colors pt-1"
            whileHover={{ gap: '10px' }}
            transition={{ duration: 0.15 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Forgot password form ─────────────────────────────────────────────────────
  if (mode === 'forgotPassword') {
    return (
      <div
        className="dark relative min-h-screen flex flex-col items-center justify-center px-5 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #07091200 0%, #080c14 40%, #0a0518 100%)' }}
      >
        <AuthBackground shouldReduce={shouldReduce} />

        <motion.div
          className="relative z-10 w-full max-w-sm space-y-6"
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <motion.div
              className="relative mx-auto w-[72px] h-[72px] flex items-center justify-center mb-1"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, type: 'spring', stiffness: 220, damping: 18 }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)',
                  filter: 'blur(16px)',
                  transform: 'scale(1.4)',
                }}
              />
              <HisabifyLogo size={56} showText={false} />
            </motion.div>

            <h1 className="text-2xl font-black text-white">Reset password</h1>
            <p className="text-white/40 text-sm">Enter your email and we'll send a secure link</p>
          </div>

          {/* Card */}
          <div
            className="rounded-3xl p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow:
                '0 24px 64px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <FloatingInput
                id="fp-email"
                label="Email address"
                type="email"
                value={email}
                onChange={setEmail}
                error={errors.email}
                icon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                placeholder="you@example.com"
              />

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? {} : { scale: 1.01, y: -1 }}
                whileTap={loading ? {} : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                  'relative w-full h-13 flex items-center justify-center gap-2 mt-1',
                  'rounded-2xl text-white font-bold text-sm',
                  'overflow-hidden',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                )}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 55%, #ec4899 100%)',
                  boxShadow: '0 8px 24px -6px rgba(139,92,246,0.45)',
                  minHeight: '52px',
                }}
              >
                {/* Shimmer overlay */}
                <span
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)',
                  }}
                />
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </motion.button>
            </form>
          </div>

          <motion.button
            onClick={() => handleModeChange('login')}
            className="flex items-center justify-center gap-2 text-sm text-white/35 hover:text-white/65 mx-auto transition-colors"
            whileHover={{ gap: '10px' }}
            transition={{ duration: 0.15 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Login / Signup form ──────────────────────────────────────────────────────
  return (
    <div
      className="dark relative min-h-screen flex flex-col items-center justify-center px-5 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #07091200 0%, #080c14 40%, #0a0518 100%)' }}
    >
      <AuthBackground shouldReduce={shouldReduce} />

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6">
        {/* ── Logo + wordmark ────────────────────────────────────────────────── */}
        <motion.div
          className="text-center"
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="relative mx-auto w-24 h-24 flex items-center justify-center mb-5"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.6, type: 'spring', stiffness: 180, damping: 16 }}
          >
            {/* Layered glow halos */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 65%)',
                filter: 'blur(20px)',
                transform: 'scale(1.5)',
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 65%)',
                filter: 'blur(28px)',
                transform: 'scale(1.8)',
              }}
            />
            <div className="relative">
              <HisabifyLogo size={80} showText={false} />
            </div>
          </motion.div>

          {/* Brand wordmark */}
          <h1
            className="text-[2.25rem] font-black tracking-[0.22em] leading-none"
            style={{
              background: 'linear-gradient(135deg, #93c5fd 0%, #c4b5fd 45%, #f9a8d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            HISABIFY
          </h1>
          <p className="text-white/35 mt-2 text-[13px] font-medium tracking-wide">
            Your pulse on prosperity
          </p>
        </motion.div>

        {/* ── Main card ──────────────────────────────────────────────────────── */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl p-5 space-y-5"
          style={{
            background:
              'linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.03) 100%)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.085)',
            boxShadow:
              '0 32px 80px -16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          {/* ── Tab pill ─────────────────────────────────────────────────────── */}
          <div
            className="flex gap-1 p-1 rounded-[18px]"
            style={{ background: 'rgba(0,0,0,0.25)' }}
          >
            {(['login', 'signup'] as const).map((tab) => {
              const active = mode === tab;
              return (
                <button
                  key={tab}
                  onClick={() => handleModeChange(tab)}
                  className={cn(
                    'relative flex-1 py-2.5 rounded-[14px] text-sm font-bold transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30',
                    active ? 'text-white' : 'text-white/35 hover:text-white/60',
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="tab-active-pill"
                      className="absolute inset-0 rounded-[14px]"
                      style={{
                        background:
                          tab === 'login'
                            ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
                            : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                        boxShadow:
                          tab === 'login'
                            ? '0 4px 12px rgba(59,130,246,0.3)'
                            : '0 4px 12px rgba(139,92,246,0.3)',
                      }}
                      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10">{tab === 'login' ? 'Sign In' : 'Sign Up'}</span>
                </button>
              );
            })}
          </div>

          {/* ── OAuth button ──────────────────────────────────────────────────── */}
          <GoogleOAuthButton
            loading={oauthLoading === 'google'}
            disabled={!!oauthLoading || loading}
            onClick={handleGoogleOAuth}
          />

          {/* ── Divider ───────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-[11px] font-medium text-white/20 tracking-wide">
              or continue with email
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* ── Email/password form ───────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              onSubmit={handleSubmit}
              className="space-y-3"
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* Email field */}
              <FloatingInput
                id="email"
                label="Email address"
                type="email"
                value={email}
                onChange={setEmail}
                error={errors.email}
                icon={<Mail className="w-4 h-4" />}
                autoComplete={mode === 'login' ? 'email' : 'email'}
                placeholder="you@example.com"
              />

              {/* Password field */}
              <div className="space-y-2">
                <div className="relative">
                  <FloatingInput
                    id="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={setPassword}
                    error={errors.password}
                    icon={<Lock className="w-4 h-4" />}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={showPassword ? 'Your password' : ''}
                    trailingSlot={
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="text-white/25 hover:text-white/55 transition-colors p-0.5"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    }
                  />
                </div>

                {/* Forgot password link */}
                {mode === 'login' && (
                  <div className="flex justify-end px-0.5">
                    <button
                      type="button"
                      onClick={() => handleModeChange('forgotPassword')}
                      className={cn(
                        'text-[11px] font-semibold transition-all duration-150',
                        'hover:opacity-80',
                      )}
                      style={{
                        background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Password strength (signup only) */}
                {mode === 'signup' && (
                  <AnimatePresence>
                    {password.length > 0 && (
                      <PasswordStrengthBar password={password} />
                    )}
                  </AnimatePresence>
                )}
              </div>

              {/* Privacy checkbox (signup only) */}
              <AnimatePresence>
                {mode === 'signup' && (
                  <motion.div
                    key="privacy-block"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <div
                      className={cn(
                        'flex items-start gap-3 rounded-2xl px-3.5 py-3',
                        'transition-colors duration-150',
                        errors.privacy
                          ? 'border border-red-500/30 bg-red-500/[0.06]'
                          : 'border border-white/[0.08] bg-white/[0.04]',
                      )}
                    >
                      <Checkbox
                        id="signup-privacy-agreement"
                        checked={agreePrivacy}
                        onCheckedChange={(value) => {
                          setAgreePrivacy(Boolean(value));
                          setErrors((current) => ({ ...current, privacy: undefined }));
                        }}
                        className="border-white/25 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 mt-0.5 flex-shrink-0"
                      />
                      <Label
                        htmlFor="signup-privacy-agreement"
                        className="text-xs leading-relaxed text-white/35 cursor-pointer select-none"
                      >
                        I have read and agree to the{' '}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-purple-400 underline underline-offset-2 hover:text-pink-400 transition-colors"
                        >
                          Privacy Policy
                        </a>
                        .
                      </Label>
                    </div>
                    {errors.privacy && (
                      <p className="text-xs text-red-400 pl-1">{errors.privacy}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={loading || !!oauthLoading}
                whileHover={loading || !!oauthLoading ? {} : { scale: 1.015, y: -1 }}
                whileTap={loading || !!oauthLoading ? {} : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                  'relative w-full flex items-center justify-center gap-2.5',
                  'rounded-2xl text-white font-bold text-sm',
                  'overflow-hidden',
                  'disabled:opacity-55 disabled:cursor-not-allowed',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                  'motion-reduce:transition-none',
                )}
                style={{
                  minHeight: '52px',
                  background: submitSuccess
                    ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)'
                    : mode === 'login'
                    ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 55%, #8b5cf6 100%)'
                    : 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 55%, #ec4899 100%)',
                  boxShadow: submitSuccess
                    ? '0 8px 24px -6px rgba(34,197,94,0.4)'
                    : mode === 'login'
                    ? '0 8px 24px -6px rgba(99,102,241,0.45)'
                    : '0 8px 24px -6px rgba(139,92,246,0.45)',
                  transition: 'background 0.3s ease, box-shadow 0.3s ease',
                }}
              >
                {/* Shimmer sweep */}
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                    backgroundSize: '200% 100%',
                  }}
                />
                <AnimatePresence mode="wait">
                  {submitSuccess ? (
                    <motion.span
                      key="success"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Done
                    </motion.span>
                  ) : loading ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative z-10"
                    >
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.form>
          </AnimatePresence>
        </motion.div>

        {/* ── Footer link ────────────────────────────────────────────────────── */}
        <motion.p
          className="text-center text-[13px] text-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => handleModeChange(mode === 'login' ? 'signup' : 'login')}
            className="font-semibold text-white/60 hover:text-white transition-colors duration-150 underline-offset-2 hover:underline"
          >
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </motion.p>

        {/* ── Legal footer ───────────────────────────────────────────────────── */}
        <motion.p
          className="text-center text-[10px] text-white/15 pb-4 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-white/35 transition-colors">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline hover:text-white/35 transition-colors">
            Privacy Policy
          </a>
          .
        </motion.p>
      </div>
    </div>
  );
}
