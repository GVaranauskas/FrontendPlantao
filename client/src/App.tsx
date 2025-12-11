import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth } from "./lib/auth-context";
import LoginPage from "@/pages/login";
import ModulesPage from "@/pages/modules";
import ShiftHandoverPage from "@/pages/shift-handover";
import ImportPage from "@/pages/import";
import DashboardPage from "@/pages/dashboard";
import ImportPanelPage from "@/pages/import-panel";
import DebugPage from "@/pages/debug";
import AnalyticsPage from "@/pages/analytics";
import TextViewerPage from "@/pages/text-viewer";
import ToolsPage from "@/pages/tools";
import AdminTemplatesPage from "@/pages/admin-templates";
import AdminUsersPage from "@/pages/admin-users";
import AdminMenuPage from "@/pages/admin-menu";
import AdminEnfermariasPage from "@/pages/admin-enfermarias";
import ImportLogsPage from "@/pages/import-logs";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <RequireAuth>
      <Component />
    </RequireAuth>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/modules">
        <ProtectedRoute component={ModulesPage} />
      </Route>
      <Route path="/shift-handover">
        <ProtectedRoute component={ShiftHandoverPage} />
      </Route>
      <Route path="/import">
        <ProtectedRoute component={ImportPage} />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/import-panel">
        <ProtectedRoute component={ImportPanelPage} />
      </Route>
      <Route path="/import-logs">
        <ProtectedRoute component={ImportLogsPage} />
      </Route>
      <Route path="/debug">
        <ProtectedRoute component={DebugPage} />
      </Route>
      <Route path="/analytics">
        <ProtectedRoute component={AnalyticsPage} />
      </Route>
      <Route path="/text-viewer">
        <ProtectedRoute component={TextViewerPage} />
      </Route>
      <Route path="/tools">
        <ProtectedRoute component={ToolsPage} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminMenuPage} />
      </Route>
      <Route path="/admin/templates">
        <ProtectedRoute component={AdminTemplatesPage} />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={AdminUsersPage} />
      </Route>
      <Route path="/admin/enfermarias">
        <ProtectedRoute component={AdminEnfermariasPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
