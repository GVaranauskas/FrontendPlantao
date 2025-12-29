import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Activity,
  Database,
  Server,
  HardDrive,
  Brain,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Cpu,
  MemoryStick,
} from "lucide-react";

interface CheckResult {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  responseTime?: number;
  details?: any;
}

interface HealthReadyResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    openai: CheckResult;
    filesystem: CheckResult;
  };
  responseTime: number;
}

interface HealthMetricsResponse {
  timestamp: string;
  uptime: number;
  memory: {
    rss: string;
    heapUsed: string;
    heapTotal: string;
    external: string;
  };
  cache: {
    entries: number;
    hitRate: string;
    totalHits: number;
    totalMisses: number;
    evictions: number;
  };
  process: {
    pid: number;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
}

function StatusIcon({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  if (status === 'pass') {
    return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  }
  if (status === 'warn') {
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  }
  return <XCircle className="w-5 h-5 text-red-500" />;
}

function StatusBadge({ status }: { status: 'healthy' | 'degraded' | 'unhealthy' }) {
  if (status === 'healthy') {
    return <Badge className="bg-green-500">Saudável</Badge>;
  }
  if (status === 'degraded') {
    return <Badge className="bg-yellow-500">Degradado</Badge>;
  }
  return <Badge variant="destructive">Indisponível</Badge>;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export default function AdminHealthPage() {
  const [, setLocation] = useLocation();

  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth, isFetching: healthFetching } = 
    useQuery<HealthReadyResponse>({
      queryKey: ["/health/ready"],
      queryFn: async () => {
        const response = await fetch("/health/ready");
        if (!response.ok) throw new Error("Failed to fetch health");
        return response.json();
      },
      refetchInterval: 30000,
    });

  const { data: metricsData, isLoading: metricsLoading, refetch: refetchMetrics, isFetching: metricsFetching } = 
    useQuery<HealthMetricsResponse>({
      queryKey: ["/health/metrics"],
      queryFn: async () => {
        const response = await fetch("/health/metrics");
        if (!response.ok) throw new Error("Failed to fetch metrics");
        return response.json();
      },
      refetchInterval: 30000,
    });

  const isLoading = healthLoading || metricsLoading;
  const isFetching = healthFetching || metricsFetching;

  const handleRefresh = () => {
    refetchHealth();
    refetchMetrics();
  };

  const checkIcons: Record<string, typeof Database> = {
    database: Database,
    redis: Server,
    openai: Brain,
    filesystem: HardDrive,
  };

  const checkLabels: Record<string, string> = {
    database: 'Banco de Dados',
    redis: 'Redis/Cache',
    openai: 'OpenAI API',
    filesystem: 'Sistema de Arquivos',
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b-4 border-primary shadow-md">
        <div className="container mx-auto px-5 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-primary">
                    Health Check
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Monitoramento de disponibilidade do sistema
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {healthData && <StatusBadge status={healthData.status} />}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isFetching}
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-5 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <Card data-testid="card-status">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {healthData?.status === 'healthy' && (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    )}
                    {healthData?.status === 'degraded' && (
                      <AlertTriangle className="w-6 h-6 text-yellow-500" />
                    )}
                    {healthData?.status === 'unhealthy' && (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                    <span className="text-2xl font-bold capitalize">
                      {healthData?.status === 'healthy' ? 'Saudável' : 
                       healthData?.status === 'degraded' ? 'Degradado' : 'Indisponível'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Resposta em {healthData?.responseTime}ms
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-uptime">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {healthData ? formatUptime(healthData.uptime) : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Desde último reinício
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-memory">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Memória</CardTitle>
                  <MemoryStick className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metricsData?.memory.heapUsed || '-'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    de {metricsData?.memory.heapTotal || '-'} heap total
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-cache">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cache</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metricsData?.cache.hitRate || '0%'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metricsData?.cache.entries || 0} entradas
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card data-testid="card-checks">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Verificações de Serviço
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {healthData?.checks && Object.entries(healthData.checks).map(([key, check]) => {
                      const Icon = checkIcons[key] || Server;
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{checkLabels[key] || key}</div>
                              <div className="text-sm text-muted-foreground">
                                {check.message}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {check.responseTime !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {check.responseTime}ms
                              </span>
                            )}
                            <StatusIcon status={check.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-system">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    Informações do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Versão</span>
                      <span className="font-medium">{healthData?.version || '-'}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Node.js</span>
                      <span className="font-medium">{metricsData?.process.nodeVersion || '-'}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Plataforma</span>
                      <span className="font-medium">
                        {metricsData?.process.platform || '-'} / {metricsData?.process.arch || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">PID</span>
                      <span className="font-medium">{metricsData?.process.pid || '-'}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">RSS</span>
                      <span className="font-medium">{metricsData?.memory.rss || '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-cache-details">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Estatísticas de Cache
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-2xl font-bold">{metricsData?.cache.entries || 0}</div>
                    <div className="text-sm text-muted-foreground">Entradas</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {metricsData?.cache.totalHits || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Hits</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {metricsData?.cache.totalMisses || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Misses</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-2xl font-bold">{metricsData?.cache.hitRate || '0%'}</div>
                    <div className="text-sm text-muted-foreground">Taxa de Hit</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-2xl font-bold">{metricsData?.cache.evictions || 0}</div>
                    <div className="text-sm text-muted-foreground">Evicções</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8 p-6 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Endpoints de Monitoramento</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-background rounded-lg">
                  <code className="text-primary font-mono">GET /health</code>
                  <div className="text-muted-foreground mt-1">Liveness probe (Kubernetes)</div>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <code className="text-primary font-mono">GET /health/ready</code>
                  <div className="text-muted-foreground mt-1">Readiness probe completo</div>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <code className="text-primary font-mono">GET /health/metrics</code>
                  <div className="text-muted-foreground mt-1">Métricas do sistema</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
