import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/PageLayout";
import * as SelectPrimitive from "@radix-ui/react-select";
import { 
  Cloud, CheckCircle, AlertCircle, Clock, Download, RefreshCcw, ChevronDown
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Enfermaria, ImportResponse, ImportStatus } from "@/types";

export default function ImportPage() {
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
      });
      const data: ImportResponse = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setLastImport(data);
    }
  });

  const handleImport = async () => {
    if (!selectedEnfermaria) return;
    await importMutation.mutateAsync(selectedEnfermaria);
  };

  const headerActions = (
    <Badge 
      variant="outline"
      className={status?.status === "online" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
      data-testid="badge-api-status"
    >
      {status?.status === "online" ? "API Online" : "API Offline"} ({status?.latency})
    </Badge>
  );

  return (
    <PageLayout title="Importar Evolucoes N8N" actions={headerActions}>
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
    </PageLayout>
  );
}
