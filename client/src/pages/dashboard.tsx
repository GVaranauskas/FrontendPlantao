import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Home, BarChart3, CheckCircle2, AlertCircle, Clock, RefreshCcw
} from "lucide-react";

interface ImportRecord {
  id: string;
  enfermaria: string;
  timestamp: string;
  total: number;
  importados: number;
  erros: number;
  detalhes: Array<{ leito: string; status: string; mensagem?: string }>;
  duracao: number;
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();

  const { data: importHistory, isLoading, refetch } = useQuery<ImportRecord[]>({
    queryKey: ["/api/import/history"],
    refetchInterval: 30000,
  });

  const lastImport = importHistory?.[0];
  
  const stats = {
    totalImports: importHistory?.length || 0,
    totalProcessados: importHistory?.reduce((sum, i) => sum + i.importados, 0) || 0,
    totalErros: importHistory?.reduce((sum, i) => sum + i.erros, 0) || 0,
  };

  const successRate = stats.totalImports > 0 
    ? Math.round((stats.totalProcessados / (stats.totalProcessados + stats.totalErros)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b-4 border-primary shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setLocation("/modules")}
                data-testid="button-home"
              >
                <Home className="w-6 h-6 text-primary" />
              </Button>
              <h1 className="text-2xl font-bold text-primary">Dashboard de Importações</h1>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => refetch()}
              data-testid="button-refresh"
            >
              <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-5 py-8">
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6" data-testid="card-total-imports">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Importações</p>
                  <p className="text-3xl font-bold text-primary">{stats.totalImports}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary opacity-50" />
              </div>
            </Card>

            <Card className="p-6" data-testid="card-processados">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pacientes Processados</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalProcessados}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </Card>

            <Card className="p-6" data-testid="card-erros">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Erros Totais</p>
                  <p className="text-3xl font-bold text-red-600">{stats.totalErros}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600 opacity-50" />
              </div>
            </Card>

            <Card className="p-6" data-testid="card-success-rate">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                  <p className="text-3xl font-bold text-blue-600">{successRate}%</p>
                </div>
                <div className="text-3xl">📊</div>
              </div>
            </Card>
          </div>

          {/* Last Import Card */}
          {lastImport && (
            <Card className="p-6" data-testid="card-last-import">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Última Importação
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Enfermaria</p>
                  <p className="font-semibold">{lastImport.enfermaria}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="font-semibold">
                    {new Date(lastImport.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duração</p>
                  <p className="font-semibold">{lastImport.duracao}ms</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-blue-600">{lastImport.total}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Importados</p>
                  <p className="text-2xl font-bold text-green-600">{lastImport.importados}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Erros</p>
                  <p className="text-2xl font-bold text-red-600">{lastImport.erros}</p>
                </div>
              </div>
            </Card>
          )}

          {/* History Timeline */}
          <Card className="p-6" data-testid="card-history">
            <h2 className="text-xl font-semibold mb-4">Histórico de Importações</h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Carregando histórico...</p>
              ) : importHistory && importHistory.length > 0 ? (
                importHistory.map((record, idx) => (
                  <div 
                    key={record.id} 
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent transition-colors"
                    data-testid={`item-history-${idx}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">Enfermaria {record.enfermaria}</span>
                        <Badge variant="outline">{record.total} pacientes</Badge>
                        <Badge variant="secondary">{record.duracao}ms</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="default" className="bg-green-600">
                        {record.importados}
                      </Badge>
                      {record.erros > 0 && (
                        <Badge variant="destructive">
                          {record.erros} erro{record.erros > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma importação realizada ainda</p>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
