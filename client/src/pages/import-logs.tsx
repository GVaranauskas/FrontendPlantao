import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Download, Copy, Trash2, Clock, CheckCircle, XCircle, Activity } from "lucide-react";
import type { ImportHistory } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ImportLog {
  id: string;
  enfermaria: string;
  timestamp: string;
  total: number;
  importados: number;
  erros: number;
  detalhes: unknown;
  duracao: number;
}

interface ImportStats {
  total: number;
  last24h: number;
  last7d: number;
  totalImportados: number;
  totalErros: number;
  runsComSucesso: number;
  runsComErro: number;
  avgDuracao: number;
  byEnfermaria: Record<string, { count: number; importados: number; erros: number }>;
}

export default function ImportLogsPage() {
  const [displayLogs, setDisplayLogs] = useState<ImportLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const { data: history, refetch, isLoading } = useQuery<ImportHistory[]>({
    queryKey: ["/api/import/history"],
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
  });

  const { data: stats } = useQuery<ImportStats>({
    queryKey: ["/api/import/stats"],
    refetchInterval: 60000,
  });

  const cleanupMutation = useMutation({
    mutationFn: (days: number) => apiRequest("DELETE", `/api/import/cleanup?days=${days}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/import/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/import/stats"] });
      toast({ 
        title: "Limpeza concluída", 
        description: `${data.deleted} logs antigos removidos`
      });
    },
    onError: () => {
      toast({ title: "Erro na limpeza", variant: "destructive" });
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["/api/import/stats"] });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (history) {
      const logs = history.map((item) => ({
        ...item,
        timestamp: item.timestamp 
          ? new Date(item.timestamp).toLocaleString("pt-BR", { 
              timeZone: "America/Sao_Paulo",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            })
          : "---",
      }));
      setDisplayLogs(logs);
    }
  }, [history]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Detalhes copiados para a área de transferência" });
  };

  const downloadLogs = () => {
    const json = JSON.stringify(displayLogs, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-logs-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const successRate = stats && (stats.runsComSucesso + stats.runsComErro) > 0
    ? Math.round((stats.runsComSucesso / (stats.runsComSucesso + stats.runsComErro)) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Logs de Importação</h1>
          <p className="text-muted-foreground">
            Monitore todas as sincronizações de dados com estatísticas consolidadas
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total Logs</span>
            </div>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Últimas 24h</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats?.last24h || 0}</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium text-muted-foreground">Últimos 7 dias</span>
            </div>
            <div className="text-2xl font-bold text-indigo-600">{stats?.last7d || 0}</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Importados</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats?.totalImportados || 0}</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-muted-foreground">Erros</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{stats?.totalErros || 0}</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-muted-foreground">Taxa Sucesso</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{successRate}%</div>
          </Card>
        </div>

        {stats?.byEnfermaria && Object.keys(stats.byEnfermaria).length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">Estatísticas por Enfermaria</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(stats.byEnfermaria).map(([enf, data]) => (
                <div key={enf} className="bg-muted/50 p-3 rounded-lg">
                  <div className="font-semibold text-primary">{enf}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <span className="text-green-600">{data.importados}</span> ok / 
                    <span className="text-red-600"> {data.erros}</span> erros
                  </div>
                  <div className="text-xs text-muted-foreground">{data.count} imports</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          <Button 
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            variant="outline"
            data-testid="button-refresh-logs"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Button 
            onClick={downloadLogs}
            variant="outline"
            data-testid="button-download-logs"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar JSON
          </Button>
          <Button 
            onClick={() => cleanupMutation.mutate(30)}
            variant="outline"
            disabled={cleanupMutation.isPending}
            data-testid="button-cleanup-logs"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {cleanupMutation.isPending ? 'Limpando...' : 'Limpar logs (+30 dias)'}
          </Button>
        </div>

        <Card className="overflow-hidden">
          {displayLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum log de importação ainda. Aguarde a próxima sincronização automática...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Timestamp (Brasília)</th>
                    <th className="px-4 py-3 text-left font-medium">Enfermaria</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Importados</th>
                    <th className="px-4 py-3 text-right font-medium">Erros</th>
                    <th className="px-4 py-3 text-right font-medium">Duração</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-center font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {displayLogs.map((log, idx) => (
                    <tr 
                      key={`${log.id}-${idx}`} 
                      className="border-b hover:bg-muted/50 transition-colors"
                      data-testid={`row-import-log-${idx}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        <code>{log.timestamp}</code>
                      </td>
                      <td className="px-4 py-3 font-medium">{log.enfermaria}</td>
                      <td className="px-4 py-3 text-right">{log.total}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="default" className="bg-green-600">
                          {log.importados}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {log.erros > 0 ? (
                          <Badge variant="destructive">{log.erros}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {log.duracao}ms
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.erros === 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                            Erro
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            const details = JSON.stringify(log.detalhes, null, 2);
                            copyToClipboard(details);
                          }}
                          data-testid={`button-copy-details-${idx}`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {displayLogs.length > 0 && (
          <Card className="mt-8 p-6">
            <h2 className="text-lg font-bold mb-4">Detalhes do Último Import</h2>
            <div className="bg-muted p-4 rounded font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
              <pre>{JSON.stringify(displayLogs[0].detalhes, null, 2)}</pre>
            </div>
          </Card>
        )}

        <div className="mt-8 p-4 bg-muted rounded-lg text-sm text-muted-foreground space-y-1">
          <p>Esta página atualiza automaticamente a cada 1 minuto</p>
          <p>Timestamps exibidos em horário de Brasília (UTC-3)</p>
          <p>Logs com mais de 30 dias podem ser removidos manualmente</p>
          <p>Tempo médio de importação: {stats?.avgDuracao || 0}ms</p>
        </div>
      </div>
    </div>
  );
}
