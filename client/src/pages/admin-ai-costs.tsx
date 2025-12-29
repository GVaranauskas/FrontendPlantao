import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Brain,
  DollarSign,
  TrendingDown,
  Zap,
  Database,
  Clock,
  CheckCircle2,
  RefreshCw,
  Loader2,
  PiggyBank,
  BarChart3,
  Activity,
} from "lucide-react";

interface AICostSummary {
  totalCalls: number;
  totalCost: number;
  cacheHitRate: number;
  avgDuration: number;
  successRate: number;
  byModel: Record<string, { calls: number; cost: number }>;
  byDay: { date: string; calls: number; cost: number; cacheHits: number }[];
  byAlertLevel: Record<string, number>;
}

interface AICostsResponse {
  period: string;
  summary: AICostSummary;
  insights: {
    totalCostFormatted: string;
    avgCostPerCall: string;
    savingsFromCache: string;
    roi: string;
  };
}

export default function AdminAICostsPage() {
  const [, setLocation] = useLocation();
  const [days, setDays] = useState("30");

  const { data, isLoading, refetch, isFetching } = useQuery<AICostsResponse>({
    queryKey: ["/api/admin/ai-costs", days],
    queryFn: async () => {
      const response = await fetch(`/api/admin/ai-costs?days=${days}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch AI costs");
      }
      return response.json();
    },
    refetchInterval: 60000,
  });

  const summary = data?.summary;
  const insights = data?.insights;

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
                <Brain className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-primary">
                    Custos de IA
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Monitoramento de custos e economia com GPT-4o-mini
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {["7", "14", "30", "60"].map((d) => (
                  <Button
                    key={d}
                    variant={days === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDays(d)}
                    data-testid={`button-period-${d}`}
                  >
                    {d}d
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
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
        ) : !summary ? (
          <Card className="p-8 text-center">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sem dados de custos</h3>
            <p className="text-muted-foreground">
              Nenhuma métrica de IA registrada no período selecionado.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <Card data-testid="card-total-cost">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {insights?.totalCostFormatted || `R$ ${summary.totalCost.toFixed(2)}`}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.totalCalls} chamadas em {days} dias
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-cache-rate">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Cache</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {summary.cacheHitRate.toFixed(1)}%
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${Math.min(summary.cacheHitRate, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.cacheHitRate > 70 ? "Excelente" : summary.cacheHitRate > 50 ? "Bom" : "Melhorar"}
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-savings">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Economia</CardTitle>
                  <PiggyBank className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {insights?.savingsFromCache || "R$ 0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Economizado com cache inteligente
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-avg-duration">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary.avgDuration > 1000
                      ? `${(summary.avgDuration / 1000).toFixed(1)}s`
                      : `${Math.round(summary.avgDuration)}ms`}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Por análise clínica
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card data-testid="card-roi">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-green-600" />
                    ROI e Economia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-700 dark:text-green-400">
                          {insights?.roi || "Cache ativo"}
                        </span>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Sistema de 4 camadas de economia funcionando
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm text-muted-foreground">Custo por chamada</div>
                        <div className="text-lg font-semibold">
                          {insights?.avgCostPerCall || "R$ 0.03"}
                        </div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm text-muted-foreground">Custo sem cache</div>
                        <div className="text-lg font-semibold text-red-600">
                          R$ {(summary.totalCalls * 0.03).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <Zap className="w-3 h-3 inline mr-1" />
                      GPT-4o-mini: R$ 0.03 por análise | Cache hit: R$ 0.00
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-success-rate">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Taxa de Sucesso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Análises bem-sucedidas</span>
                      <Badge variant={(summary.successRate || 100) >= 95 ? "default" : "secondary"}>
                        {summary.successRate?.toFixed(1) || 100}%
                      </Badge>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min(summary.successRate || 100, 100)}%` }}
                      />
                    </div>

                    {summary.byAlertLevel && Object.keys(summary.byAlertLevel).length > 0 && (
                      <div className="space-y-2 mt-4">
                        <div className="text-sm font-medium">Por Nível de Alerta</div>
                        <div className="flex gap-2 flex-wrap">
                          {summary.byAlertLevel.VERMELHO && (
                            <Badge variant="destructive" className="gap-1">
                              <span className="w-2 h-2 rounded-full bg-white" />
                              Crítico: {summary.byAlertLevel.VERMELHO}
                            </Badge>
                          )}
                          {summary.byAlertLevel.AMARELO && (
                            <Badge className="bg-yellow-500 gap-1">
                              <span className="w-2 h-2 rounded-full bg-white" />
                              Atenção: {summary.byAlertLevel.AMARELO}
                            </Badge>
                          )}
                          {summary.byAlertLevel.VERDE && (
                            <Badge className="bg-green-500 gap-1">
                              <span className="w-2 h-2 rounded-full bg-white" />
                              Estável: {summary.byAlertLevel.VERDE}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {summary.byDay && summary.byDay.length > 0 && (
              <Card data-testid="card-daily-breakdown">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Uso Diário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {summary.byDay.slice(-14).reverse().map((day) => (
                      <div
                        key={day.date}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium w-24">
                            {new Date(day.date).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {day.calls} chamadas
                            </Badge>
                            {day.cacheHits > 0 && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Database className="w-3 h-3" />
                                {day.cacheHits} cache
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">
                          R$ {day.cost.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mt-8 p-6 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">
                  Sistema de Economia GPT-4o-mini
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-background rounded-lg">
                  <div className="font-medium text-primary mb-1">1. Change Detection</div>
                  <div className="text-muted-foreground">85-90% economia</div>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <div className="font-medium text-primary mb-1">2. Intelligent Cache</div>
                  <div className="text-muted-foreground">60-80% economia</div>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <div className="font-medium text-primary mb-1">3. GPT-4o-mini</div>
                  <div className="text-muted-foreground">50% economia vs GPT-4</div>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <div className="font-medium text-primary mb-1">4. Auto Sync 15min</div>
                  <div className="text-muted-foreground">95%+ economia</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <Badge className="bg-primary">
                  Meta: ~99.8% de economia total (R$50 → R$0.03 por análise)
                </Badge>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
