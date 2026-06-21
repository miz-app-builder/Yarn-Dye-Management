import "./lib/api"; // side effect: sets axios baseURL
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@workspace/replit-auth-web";
import LoginPage from "@/pages/LoginPage";
import AppShell from "@/components/layout/AppShell";
import DashboardPage from "@/pages/DashboardPage";
import OrdersPage from "@/pages/OrdersPage";
import NewOrderPage from "@/pages/NewOrderPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import FactoriesPage from "@/pages/FactoriesPage";
import ReportsPage from "@/pages/ReportsPage";
import UsersPage from "@/pages/UsersPage";
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
          <Route path="/orders/:id" component={OrderDetailPage} />
          <Route path="/factories" component={FactoriesPage} />
          <Route path="/reports" component={ReportsPage} />
          <Route path="/users" component={UsersPage} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </AuthGuard>
  );
}

export default function App() {
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