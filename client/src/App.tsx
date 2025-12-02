import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import ImportLogsPage from "@/pages/import-logs";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/modules" component={ModulesPage} />
      <Route path="/shift-handover" component={ShiftHandoverPage} />
      <Route path="/import" component={ImportPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/import-panel" component={ImportPanelPage} />
      <Route path="/import-logs" component={ImportLogsPage} />
      <Route path="/debug" component={DebugPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/text-viewer" component={TextViewerPage} />
      <Route path="/tools" component={ToolsPage} />
      <Route path="/admin" component={AdminMenuPage} />
      <Route path="/admin/templates" component={AdminTemplatesPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
