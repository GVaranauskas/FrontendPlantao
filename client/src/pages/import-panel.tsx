import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportEvolucoes } from "@/components/ImportEvolucoes";
import { Home, ShieldAlert, Database, Clock } from "lucide-react";

export default function ImportPanelPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  Painel de Administração
                </h1>
                <p className="text-xs text-muted-foreground">
                  Importação de Dados
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
              <ShieldAlert className="w-3 h-3 mr-1" />
              Acesso Restrito
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-5 py-8">
        <div className="grid gap-8 max-w-2xl">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4" data-testid="card-info-database">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-sm">Sincronização de Dados</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Importa evolucões diretamente da API N8N para o sistema
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4" data-testid="card-info-schedule">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-sm">Automação</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sincronização automática executada a cada hora
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Import Component */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Gerenciar Importações
            </h2>
            <ImportEvolucoes />
          </div>

          {/* Info Alert */}
          <Card
            className="p-4 border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20"
            data-testid="card-info-alert"
          >
            <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-300 mb-2">
              Informações Importantes
            </h3>
            <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
              <li>• A importação integra dados da API N8N com validação automática</li>
              <li>• Registros duplicados são atualizados automaticamente</li>
              <li>• Histórico completo de importações é mantido para auditoria</li>
              <li>• Erros de validação são reportados para investigação</li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
}
