import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft,
  Activity,
  Users,
  Eye,
  MousePointerClick,
  Clock,
  Monitor,
  TrendingUp,
  Calendar,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface UsageMetrics {
  totalSessions: number;
  activeSessions: number;
  totalPageViews: number;
  totalActions: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  avgPageViewsPerSession: number;
}

interface SessionStats {
  totalSessions: number;
  avgDuration: number;
  byDevice: Record<string, number>;
  byBrowser: Record<string, number>;
  byUser: Array<{ userId: string; userName: string; sessions: number }>;
}

interface PageStats {
  pagePath: string;
  pageTitle: string | null;
  views: number;
  uniqueUsers: number;
}

interface ActionStats {
  actionName: string;
  actionCategory: string | null;
  count: number;
  uniqueUsers: number;
}

const COLORS = ["#0056b3", "#007bff", "#28a745", "#dc3545", "#ffc107", "#17a2b8", "#6c757d", "#6f42c1"];

export default function AdminUsageAnalyticsPage() {
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [activeTab, setActiveTab] = useState("overview");

  const getDateRange = () => {
    const endDate = new Date();
    let startDate: Date | undefined;
    
    switch (dateRange) {
      case "7d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate = undefined;
    }
    
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set("startDate", startDate.toISOString());
  if (endDate) queryParams.set("endDate", endDate.toISOString());

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<UsageMetrics>({
    queryKey: ["/api/admin/analytics/metrics", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/metrics?${queryParams.toString()}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
  });

  const { data: sessionStats, isLoading: sessionsLoading } = useQuery<SessionStats>({
    queryKey: ["/api/admin/analytics/sessions", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/sessions?${queryParams.toString()}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      if (!res.ok) throw new Error("Failed to fetch session stats");
      return res.json();
    },
  });

  const { data: topPages, isLoading: pagesLoading } = useQuery<PageStats[]>({
    queryKey: ["/api/admin/analytics/top-pages", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/top-pages?limit=10&${queryParams.toString()}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      if (!res.ok) throw new Error("Failed to fetch top pages");
      return res.json();
    },
  });

  const { data: topActions, isLoading: actionsLoading } = useQuery<ActionStats[]>({
    queryKey: ["/api/admin/analytics/top-actions", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/top-actions?limit=10&${queryParams.toString()}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      if (!res.ok) throw new Error("Failed to fetch top actions");
      return res.json();
    },
  });

  const deviceData = useMemo(() => {
    if (!sessionStats?.byDevice) return [];
    return Object.entries(sessionStats.byDevice).map(([name, value]) => ({ name, value }));
  }, [sessionStats]);

  const browserData = useMemo(() => {
    if (!sessionStats?.byBrowser) return [];
    return Object.entries(sessionStats.byBrowser).map(([name, value]) => ({ name, value }));
  }, [sessionStats]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const formatPagePath = (path: string) => {
    const pathMap: Record<string, string> = {
      "/": "Dashboard",
      "/modules": "Modulos",
      "/shift-handover": "Passagem de Plantao",
      "/import": "Importar Dados",
      "/analytics": "Analytics Pacientes",
      "/admin-menu": "Menu Admin",
      "/admin-users": "Gerenciar Usuarios",
      "/admin-nursing-units": "Unidades de Internacao",
      "/admin-templates": "Templates",
      "/patients-history": "Historico Pacientes",
    };
    return pathMap[path] || path;
  };

  const isLoading = metricsLoading || sessionsLoading || pagesLoading || actionsLoading;

  return (
    <div className="min-h-screen bg-background p-6" data-testid="usage-analytics-page">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin-menu")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analytics de Uso</h1>
              <p className="text-sm text-muted-foreground">Metricas de uso e comportamento do sistema</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-40" data-testid="select-date-range">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Ultimos 7 dias</SelectItem>
                <SelectItem value="30d">Ultimos 30 dias</SelectItem>
                <SelectItem value="90d">Ultimos 90 dias</SelectItem>
                <SelectItem value="all">Todo o periodo</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchMetrics()}
              disabled={isLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-total-sessions">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessoes Totais</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalSessions || 0}</div>
              <p className="text-xs text-muted-foreground">
                {metrics?.activeSessions || 0} ativas agora
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-unique-users">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Unicos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.uniqueUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                no periodo selecionado
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-page-views">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visualizacoes</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalPageViews || 0}</div>
              <p className="text-xs text-muted-foreground">
                ~{metrics?.avgPageViewsPerSession || 0} por sessao
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-avg-duration">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duracao Media</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(metrics?.avgSessionDuration || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                tempo medio por sessao
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 border-b pb-2">
            <Button
              variant={activeTab === "overview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("overview")}
              data-testid="tab-overview"
            >
              Visao Geral
            </Button>
            <Button
              variant={activeTab === "pages" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("pages")}
              data-testid="tab-pages"
            >
              Paginas
            </Button>
            <Button
              variant={activeTab === "actions" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("actions")}
              data-testid="tab-actions"
            >
              Acoes
            </Button>
            <Button
              variant={activeTab === "users" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("users")}
              data-testid="tab-users"
            >
              Usuarios
            </Button>
          </div>

          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Dispositivos
                  </CardTitle>
                  <CardDescription>Distribuicao por tipo de dispositivo</CardDescription>
                </CardHeader>
                <CardContent>
                  {deviceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={deviceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {deviceData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Sem dados disponveis
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Navegadores
                  </CardTitle>
                  <CardDescription>Distribuicao por navegador</CardDescription>
                </CardHeader>
                <CardContent>
                  {browserData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={browserData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#0056b3" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Sem dados disponiveis
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "pages" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Paginas Mais Visitadas
                </CardTitle>
                <CardDescription>Top 10 paginas por numero de visualizacoes</CardDescription>
              </CardHeader>
              <CardContent>
                {topPages && topPages.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topPages} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                          type="category"
                          dataKey="pagePath"
                          width={150}
                          tickFormatter={(value) => formatPagePath(value)}
                        />
                        <Tooltip
                          formatter={(value, name) => [value, name === "views" ? "Visualizacoes" : "Usuarios"]}
                          labelFormatter={(label) => formatPagePath(label)}
                        />
                        <Bar dataKey="views" fill="#0056b3" name="Visualizacoes" />
                        <Bar dataKey="uniqueUsers" fill="#28a745" name="Usuarios Unicos" />
                      </BarChart>
                    </ResponsiveContainer>

                    <Table className="mt-4">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pagina</TableHead>
                          <TableHead className="text-right">Visualizacoes</TableHead>
                          <TableHead className="text-right">Usuarios Unicos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topPages.map((page, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{formatPagePath(page.pagePath)}</TableCell>
                            <TableCell className="text-right">{page.views}</TableCell>
                            <TableCell className="text-right">{page.uniqueUsers}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Sem dados disponiveis
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "actions" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MousePointerClick className="h-5 w-5" />
                  Acoes Mais Frequentes
                </CardTitle>
                <CardDescription>Top 10 acoes realizadas pelos usuarios</CardDescription>
              </CardHeader>
              <CardContent>
                {topActions && topActions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Acao</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Ocorrencias</TableHead>
                        <TableHead className="text-right">Usuarios</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topActions.map((action, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{action.actionName}</TableCell>
                          <TableCell>
                            {action.actionCategory ? (
                              <Badge variant="secondary">{action.actionCategory}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{action.count}</TableCell>
                          <TableCell className="text-right">{action.uniqueUsers}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Sem dados disponiveis
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "users" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuarios Mais Ativos
                </CardTitle>
                <CardDescription>Top 10 usuarios por numero de sessoes</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionStats?.byUser && sessionStats.byUser.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead className="text-right">Sessoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionStats.byUser.map((user, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{user.userName}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{user.sessions}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Sem dados disponiveis
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
