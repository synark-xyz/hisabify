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
      </Route>

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
