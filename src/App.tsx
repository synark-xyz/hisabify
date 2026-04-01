import { useState, useEffect } from "react";
import { Capacitor } from '@capacitor/core';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';
import { App as CapacitorApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { ProfileProvider } from "@/hooks/useProfile";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { ExpensesPage } from "@/pages/ExpensesPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AuthPage } from "@/pages/AuthPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { BudgetPage } from "@/pages/BudgetPage";
import ReportsPage from "@/pages/ReportsPage";
import { InstallPage } from "@/pages/InstallPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { SplashScreen } from "@/components/SplashScreen";
import NotFound from "@/pages/NotFound";
import { SettingsPage } from "@/pages/SettingsPage";
import { PreferencesPage } from "@/pages/settings/PreferencesPage";
import { NotificationSettingsPage } from "@/pages/settings/NotificationSettingsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { PrivacyPolicyPage } from "@/pages/PrivacyPolicyPage";
import { DeleteAccountPage } from "@/pages/DeleteAccountPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { SupportPage } from "@/pages/SupportPage";
import { FaqPage } from "@/pages/FaqPage";
import { PersonalPage } from "@/pages/profile/PersonalPage";
import { DataPage } from "@/pages/profile/DataPage";
import { ReferralsPage } from "@/pages/profile/ReferralsPage";
import { initViewportHeight } from "@/lib/viewport";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { getAuthCallbackRouteFromUrl } from "@/lib/authRedirect";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    /* Loading is handled by splash screen or internal loaders closer to implementation */
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Preserve ?ref= and ?challenge= params so AuthPage can capture them
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    const challenge = params.get('challenge');
    const authParams = new URLSearchParams();
    if (ref) authParams.set('ref', ref);
    if (challenge) authParams.set('challenge', challenge);
    const authPath = authParams.toString() ? `/auth?${authParams.toString()}` : '/auth';
    return <Navigate to={authPath} replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  // In E2E test runs, `e2e_skip_splash` is pre-set via addInitScript so
  // the splash screen is bypassed without affecting production behaviour.
  // Bug fix: first-time users (hasSeenOnboarding=false) must not see the web
  // SplashScreen after they complete onboarding — go straight to /auth.
  // Returning users (hasSeenOnboarding=true) still get the splash on every launch.
  const [showSplash, setShowSplash] = useState(() => {
    if (localStorage.getItem('e2e_skip_splash') === 'true') return false;
    return localStorage.getItem('hasSeenOnboarding') === 'true';
  });
  // Read localStorage synchronously so the initial render is already correct —
  // no frame where a returning user sees OnboardingPage before the check resolves.
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(
    () => localStorage.getItem('hasSeenOnboarding') === 'true'
  );
  // Only needed when localStorage is empty: async Capacitor Preferences check
  // (covers native installs where localStorage was cleared but Preferences persisted).
  const [checkingOnboarding, setCheckingOnboarding] = useState(
    () => localStorage.getItem('hasSeenOnboarding') !== 'true'
  );

  useEffect(() => {
    if (!checkingOnboarding) return;
    Preferences.get({ key: 'hasSeenOnboarding' })
      .then(({ value }) => {
        if (value === 'true') {
          setHasSeenOnboarding(true);
          localStorage.setItem('hasSeenOnboarding', 'true'); // keep in sync for next launch
        }
        setCheckingOnboarding(false);
      })
      .catch(() => {
        // If the Capacitor Preferences bridge is unavailable (e.g. cold-start race),
        // fall back to treating this as a fresh install so onboarding is shown.
        setCheckingOnboarding(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const location = useLocation();

  // Failsafe: hide native Capacitor splash once we know what screen to show.
  // Defer until checkingOnboarding is resolved so the correct screen is ready.
  useEffect(() => {
    if (checkingOnboarding) return;
    if (Capacitor.isNativePlatform()) {
      CapacitorSplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
    }
  }, [checkingOnboarding]);

  // Render nothing while we're still reading Capacitor Preferences.
  // The native splash stays visible during this brief window (~50ms).
  if (checkingOnboarding) return null;

  // First launch: skip splash and go straight to onboarding.
  if (!hasSeenOnboarding) {
    return (
      <OnboardingPage
        onComplete={() => {
          localStorage.setItem('hasSeenOnboarding', 'true');
          Preferences.set({ key: 'hasSeenOnboarding', value: 'true' });
          setHasSeenOnboarding(true);
        }}
      />
    );
  }

  // Returning user: show splash before the main routes.
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <Routes>
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<ExpensesPage />} />
        <Route path="/expenses" element={<Navigate to="/transactions" replace />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/savings" element={<Navigate to="/budget?tab=goals" replace />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/personal" element={<PersonalPage />} />
        <Route path="/profile/data" element={<DataPage />} />
        <Route path="/profile/invite" element={<ReferralsPage />} />
      </Route>

      {/* Pages without Main Layout (No double header) */}
      <Route
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-background">
              {/* These pages have their own internal Headers */}
              <SettingsPage />
            </div>
          </ProtectedRoute>
        }
        path="/settings"
      />

      <Route element={<ProtectedRoute><PreferencesPage /></ProtectedRoute>} path="/settings/preferences" />
      <Route element={<ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>} path="/settings/notifications" />
      <Route element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} path="/notifications" />
      <Route element={<ProtectedRoute><SupportPage /></ProtectedRoute>} path="/support" />
      <Route element={<ProtectedRoute><FaqPage /></ProtectedRoute>} path="/faq" />

      <Route
        path="/auth"
        element={
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        }
      />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      {/* /onboarding kept for direct navigation (e.g. from settings "replay tour") */}
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />
      <Route
        path="/install"
        element={<InstallPage />}
      />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/delete-account" element={<DeleteAccountPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <ProfileProvider>
                <CurrencyProvider>
                  <RootLogic />
                </CurrencyProvider>
              </ProfileProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

// On Android, WebView localStorage survives reinstalls on some OS versions.
// Detect a fresh install via Capacitor Preferences (which IS cleared on reinstall)
// and force-sign-out if the flag is missing.
async function clearStaleSessionOnFreshInstall() {
  if (!Capacitor.isNativePlatform()) return;
  const { value } = await Preferences.get({ key: 'app_installed' });
  if (!value) {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.auth.signOut();
    localStorage.clear();
    await Preferences.set({ key: 'app_installed', value: 'true' });
  }
}

// Separated component to use hooks inside BrowserRouter
function RootLogic() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Clear stale WebView session on fresh install
  useEffect(() => {
    clearStaleSessionOnFreshInstall().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Android back button — navigates back in history; exits on double-back from root
  useAndroidBackButton(navigate);

  // Track screen views in Firebase Analytics
  useScreenTracking();

  // Register Android device for FCM push notifications
  usePushNotifications();

  // Initialize viewport height fix for mobile
  useEffect(() => {
    const cleanup = initViewportHeight();
    return cleanup;
  }, []);

  // Handle deep links on native platforms (e.g. OAuth callback)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      console.log('[App] appUrlOpen event received:', url);
      const callbackRoute = getAuthCallbackRouteFromUrl(url);

      if (callbackRoute) {
        console.log('[App] Navigating to auth callback with:', { callbackRoute, fullUrl: url });
        navigate(callbackRoute, { replace: true });
      } else {
        console.log('[App] Ignoring non-auth URL:', url);
      }
    });

    console.log('[App] Registered appUrlOpen listener');
    return () => {
      console.log('[App] Removing appUrlOpen listener');
      listener.then((l) => l.remove());
    };
  }, [navigate]);

  // Set Firebase Analytics user + enable Crashlytics
  useEffect(() => {
    if (user) {
      import('@/lib/analytics').then(({ analytics }) => {
        analytics.setUser(user.id);
        analytics.initCrashlytics();
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Log activity once every 12 hours
      const logActivity = async () => {
        const lastLog = localStorage.getItem(`last_activity_log_${user.id}`);
        const now = new Date().getTime();

        if (!lastLog || now - parseInt(lastLog) > 12 * 60 * 60 * 1000) {
          const { supabase } = await import("@/integrations/supabase/client");
          await supabase
            .from('users')
            .update({ last_active_at: new Date().toISOString() })
            .eq('user_id', user.id);
          localStorage.setItem(`last_activity_log_${user.id}`, now.toString());
        }
      };
      logActivity();
    }
  }, [user]);

  return <AppRoutes />;
}

export default App;
