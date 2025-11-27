import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Download, Copy } from "lucide-react";
import type { ImportHistory } from "@shared/schema";

interface ImportLog extends ImportHistory {
  timestamp: string;
}

export default function ImportLogsPage() {
  const [displayLogs, setDisplayLogs] = useState<ImportLog[]>([]);

  const { data: history, refetch, isLoading } = useQuery<ImportHistory[]>({
    queryKey: ["/api/import/history"],
    refetchInterval: 5000, // Atualizar a cada 5 segundos
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (history) {
      const logs = history.map((item) => ({
        ...item,
        timestamp: item.timestamp 
          ? new Date(item.timestamp).toLocaleString("pt-BR", { 
              timeZone: "UTC",
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📊 Logs de Importação</h1>
          <p className="text-muted-foreground">
            Monitore em tempo real todas as sincronizações de dados
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Total de Imports</div>
            <div className="text-3xl font-bold mt-2">{displayLogs.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Últimas 24h</div>
            <div className="text-3xl font-bold mt-2">
              {displayLogs.filter(log => {
                const logDate = new Date(log.timestamp);
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return logDate > dayAgo;
              }).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Importados</div>
            <div className="text-3xl font-bold mt-2">
              {displayLogs.reduce((acc, log) => acc + (log.importados || 0), 0)}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Total de Erros</div>
            <div className="text-3xl font-bold mt-2 text-red-600">
              {displayLogs.reduce((acc, log) => acc + (log.erros || 0), 0)}
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-6">
          <Button 
            onClick={() => refetch()}
            disabled={isLoading}
            variant="outline"
            data-testid="button-refresh-logs"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={downloadLogs}
            variant="outline"
            data-testid="button-download-logs"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar JSON
          </Button>
        </div>

        {/* Logs Table */}
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
                    <th className="px-4 py-3 text-left font-medium">Timestamp (UTC)</th>
                    <th className="px-4 py-3 text-left font-medium">Enfermaria</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Importados</th>
                    <th className="px-4 py-3 text-right font-medium">Erros</th>
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
                      <td className="px-4 py-3 text-center">
                        {log.erros === 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            ✓ OK
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            ⚠ Erro
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
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

        {/* Details Section */}
        {displayLogs.length > 0 && (
          <Card className="mt-8 p-6">
            <h2 className="text-lg font-bold mb-4">Detalhes do Último Import</h2>
            <div className="bg-muted p-4 rounded font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
              <pre>{JSON.stringify(displayLogs[0].detalhes, null, 2)}</pre>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <p>✓ Esta página atualiza automaticamente a cada 5 segundos</p>
          <p>✓ Você pode copiar os detalhes de cada importação com um clique</p>
        </div>
      </div>
    </div>
  );
}
