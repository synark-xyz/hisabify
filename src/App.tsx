import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import SavingsPage from "@/pages/SavingsPage";
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
import { PersonalPage } from "@/pages/profile/PersonalPage";
import { DataPage } from "@/pages/profile/DataPage";
import { ReferralsPage } from "@/pages/profile/ReferralsPage";
import { initViewportHeight } from "@/lib/viewport";

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

  if (loading) {
    /* Loading is handled by splash screen or internal loaders closer to implementation */
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';

  if (loading) {
    return null;
  }

  if (!hasSeenOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();

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
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/savings" element={<SavingsPage />} />
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
      <Route element={<ProtectedRoute><PrivacyPolicyPage /></ProtectedRoute>} path="/privacy" />

      <Route
        path="/auth"
        element={
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        }
      />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />
      <Route
        path="/install"
        element={<InstallPage />}
      />
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

// Separated component to use hooks inside BrowserRouter
function RootLogic() {
  const { user } = useAuth();

  // Initialize viewport height fix for mobile
  useEffect(() => {
    const cleanup = initViewportHeight();
    return cleanup;
  }, []);

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
