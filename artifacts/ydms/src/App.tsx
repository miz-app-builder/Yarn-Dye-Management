import "./lib/api"; // side effect: sets axios baseURL
import { supabaseMisconfigured } from "@/lib/supabase";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/LoginPage";
import AppShell from "@/components/layout/AppShell";
import DashboardPage from "@/pages/DashboardPage";
import OrdersPage from "@/pages/OrdersPage";
import NewOrderPage from "@/pages/NewOrderPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import EditOrderPage from "@/pages/EditOrderPage";
import FactoriesPage from "@/pages/FactoriesPage";
import ReportsPage from "@/pages/ReportsPage";
import UsersPage from "@/pages/UsersPage";
import RawMaterialsPage from "@/pages/RawMaterialsPage";
import NotFound from "@/pages/not-found";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  if (!isAuthenticated) return <LoginPage />;
  return <>{children}</>;
}

function Router() {
  return (
    <AuthGuard>
      <AppShell>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/orders" component={OrdersPage} />
          <Route path="/orders/new" component={NewOrderPage} />
          <Route path="/orders/:id/edit" component={EditOrderPage} />
          <Route path="/orders/:id" component={OrderDetailPage} />
          <Route path="/factories" component={FactoriesPage} />
          <Route path="/reports" component={ReportsPage} />
          <Route path="/users" component={UsersPage} />
          <Route path="/raw-materials" component={RawMaterialsPage} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </AuthGuard>
  );
}

function SupabaseMisconfiguredScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md text-center p-8 bg-white rounded-xl shadow border">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Configuration Error</h1>
        <p className="text-gray-500 text-sm">
          <code className="bg-gray-100 px-1 rounded">SUPABASE_URL</code> or{" "}
          <code className="bg-gray-100 px-1 rounded">SUPABASE_ANON_KEY</code> is missing.
          <br /><br />
          Please ensure both secrets are set, then restart the workflow.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (supabaseMisconfigured) return <SupabaseMisconfiguredScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}