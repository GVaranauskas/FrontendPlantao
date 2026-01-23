import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth, FirstAccessGuard } from "./lib/auth-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

const LoginPage = lazy(() => import("@/pages/login"));
const SetupPage = lazy(() => import("@/pages/setup"));
const FirstAccessPage = lazy(() => import("@/pages/first-access"));
const ModulesPage = lazy(() => import("@/pages/modules"));
const ShiftHandoverPage = lazy(() => import("@/pages/shift-handover"));
const ImportPage = lazy(() => import("@/pages/import"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const ImportPanelPage = lazy(() => import("@/pages/import-panel"));
const DebugPage = lazy(() => import("@/pages/debug"));
const AnalyticsPage = lazy(() => import("@/pages/analytics"));
const TextViewerPage = lazy(() => import("@/pages/text-viewer"));
const ToolsPage = lazy(() => import("@/pages/tools"));
const AdminTemplatesPage = lazy(() => import("@/pages/admin-templates"));
const AdminUsersPage = lazy(() => import("@/pages/admin-users"));
const AdminMenuPage = lazy(() => import("@/pages/admin-menu"));
const AdminNursingUnitsPage = lazy(() => import("@/pages/admin-nursing-units"));
const AdminUsageAnalyticsPage = lazy(() => import("@/pages/admin-usage-analytics"));
const ImportLogsPage = lazy(() => import("@/pages/import-logs"));
const PatientsHistoryPage = lazy(() => import("@/pages/patients-history"));
const NotFound = lazy(() => import("@/pages/not-found"));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen" data-testid="loading-spinner">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function ProtectedRoute({ component: Component, allowedRoles }: { component: React.ComponentType, allowedRoles?: string[] }) {
  return (
    <RequireAuth allowedRoles={allowedRoles}>
      <Suspense fallback={<LoadingSpinner />}>
        <Component />
      </Suspense>
    </RequireAuth>
  );
}

function LazyRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Component />
    </Suspense>
  );
}

function FirstAccessRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <FirstAccessGuard>
      <Suspense fallback={<LoadingSpinner />}>
        <Component />
      </Suspense>
    </FirstAccessGuard>
  );
}

function Router() {
  return (
    <Switch>
        <Route path="/">
          <LazyRoute component={LoginPage} />
        </Route>
        <Route path="/setup">
          <LazyRoute component={SetupPage} />
        </Route>
        <Route path="/first-access">
          <FirstAccessRoute component={FirstAccessPage} />
        </Route>
        <Route path="/modules">
          <ProtectedRoute component={ModulesPage} />
        </Route>
        <Route path="/shift-handover">
          <ProtectedRoute component={ShiftHandoverPage} />
        </Route>
        <Route path="/import">
          <ProtectedRoute component={ImportPage} allowedRoles={["admin"]} />
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute component={DashboardPage} />
        </Route>
        <Route path="/import-panel">
          <ProtectedRoute component={ImportPanelPage} allowedRoles={["admin"]} />
        </Route>
        <Route path="/import-logs">
          <ProtectedRoute component={ImportLogsPage} allowedRoles={["admin"]} />
        </Route>
        <Route path="/debug">
          <ProtectedRoute component={DebugPage} allowedRoles={["admin"]} />
        </Route>
        <Route path="/analytics">
          <ProtectedRoute component={AnalyticsPage} />
        </Route>
        <Route path="/text-viewer">
          <ProtectedRoute component={TextViewerPage} />
        </Route>
        <Route path="/tools">
          <ProtectedRoute component={ToolsPage} allowedRoles={["admin"]} />
        </Route>
        <Route path="/admin">
          <ProtectedRoute component={AdminMenuPage} allowedRoles={["admin"]} />
        </Route>
        <Route path="/admin/templates">
          <ProtectedRoute component={AdminTemplatesPage} allowedRoles={["admin"]} />
        </Route>
        <Route path="/admin/users">
          <ProtectedRoute component={AdminUsersPage} allowedRoles={["admin"]} />
        </Route>
        <Route path="/admin/nursing-units">
          <ProtectedRoute component={AdminNursingUnitsPage} allowedRoles={["admin"]} />
        </Route>
        <Route path="/admin/usage-analytics">
          <ProtectedRoute component={AdminUsageAnalyticsPage} allowedRoles={["admin"]} />
        </Route>
        <Route path="/patients-history">
          <ProtectedRoute component={PatientsHistoryPage} />
        </Route>
        <Route>
          <LazyRoute component={NotFound} />
        </Route>
      </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Toaster />
            <Router />
          </ErrorBoundary>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
