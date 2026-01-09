import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as SelectPrimitive from "@radix-ui/react-select";
import { 
  Cloud, Home, CheckCircle, AlertCircle, Clock, Download, RefreshCcw, ChevronDown
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Enfermaria, ImportResponse, ImportStatus } from "@/types";

export default function ImportPage() {
  const [, setLocation] = useLocation();
  const [selectedEnfermaria, setSelectedEnfermaria] = useState<string>("");
  const [lastImport, setLastImport] = useState<ImportResponse | null>(null);

  const { data: enfermarias, isLoading: isLoadingEnfermarias } = useQuery<Enfermaria[]>({
    queryKey: ["/api/enfermarias"],
  });

  const { data: status } = useQuery<ImportStatus>({
    queryKey: ["/api/import/status"],
    refetchInterval: 30000,
  });

  const importMutation = useMutation({
    mutationFn: async (enfermaria: string) => {
      const response = await apiRequest("POST", "/api/import/evolucoes", {
        enfermaria
      }) as unknown as ImportResponse;
      return response;
    },
    onSuccess: (data) => {
      setLastImport(data);
    }
  });

  const handleImport = async () => {
    if (!selectedEnfermaria) return;
    await importMutation.mutateAsync(selectedEnfermaria);
  };

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
              <h1 className="text-2xl font-bold text-primary">Importar Evolucoes N8N</h1>
            </div>
            <Badge 
              variant="outline"
              className={status?.status === "online" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
              data-testid="badge-api-status"
            >
              {status?.status === "online" ? "API Online" : "API Offline"} ({status?.latency})
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-5 py-8">
        <div className="grid gap-6 max-w-2xl">
          {/* Import Card */}
          <Card className="p-6" data-testid="card-import-form">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              Importar de Enfermaria
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Selecione a Enfermaria</label>
                <SelectPrimitive.Root 
                  value={selectedEnfermaria} 
                  onValueChange={setSelectedEnfermaria}
                  disabled={isLoadingEnfermarias}
                >
                  <SelectPrimitive.Trigger 
                    className="flex items-center justify-between w-full px-3 py-2 border rounded-md"
                    data-testid="select-enfermaria"
                  >
                    <SelectPrimitive.Value placeholder="Carregando enfermarias..." />
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </SelectPrimitive.Trigger>
                  <SelectPrimitive.Content className="border rounded-md bg-card shadow-md">
                    <SelectPrimitive.Viewport className="p-2">
                      {enfermarias?.map(e => (
                        <SelectPrimitive.Item 
                          key={e.codigo} 
                          value={e.codigo}
                          className="px-3 py-2 hover:bg-accent rounded cursor-pointer"
                        >
                          <SelectPrimitive.ItemText>{e.nome}</SelectPrimitive.ItemText>
                        </SelectPrimitive.Item>
                      ))}
                    </SelectPrimitive.Viewport>
                  </SelectPrimitive.Content>
                </SelectPrimitive.Root>
              </div>

              <Button 
                onClick={handleImport}
                disabled={!selectedEnfermaria || importMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-import"
              >
                {importMutation.isPending ? (
                  <>
                    <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Importar Evolucoes
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Last Import Results */}
          {lastImport && (
            <Card className="p-6" data-testid="card-import-results">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Resultado da Importação
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Importados</p>
                    <p className="text-2xl font-bold text-green-600">{lastImport.stats.importados}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Erros</p>
                    <p className="text-2xl font-bold text-red-600">{lastImport.stats.erros}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Detalhes por Leito:</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {lastImport.stats.detalhes.map((detail, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-card border rounded">
                        <span className="font-mono text-sm font-semibold">{detail.leito}</span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={detail.status === "criado" ? "default" : detail.status === "atualizado" ? "secondary" : "destructive"}
                            data-testid={`badge-status-${idx}`}
                          >
                            {detail.status}
                          </Badge>
                          {detail.mensagem && (
                            <span className="text-xs text-muted-foreground truncate max-w-48">
                              {detail.mensagem}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center pt-2">
                  {lastImport.mensagem}
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
