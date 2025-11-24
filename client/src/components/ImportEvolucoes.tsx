import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Enfermaria {
  codigo: string;
  nome: string;
}

interface ImportStats {
  total: number;
  importados: number;
  erros: number;
  detalhes: Array<{ leito: string; status: string; mensagem?: string }>;
}

interface ImportResponse {
  success: boolean;
  enfermaria: string;
  stats: ImportStats;
  mensagem: string;
}

export function ImportEvolucoes() {
  const [selectedEnfermaria, setSelectedEnfermaria] = useState<string>("");
  const [result, setResult] = useState<ImportResponse | null>(null);

  const { data: enfermarias, isLoading: isLoadingEnfermarias } = useQuery<
    Enfermaria[]
  >({
    queryKey: ["/api/enfermarias"],
  });

  const importMutation = useMutation({
    mutationFn: async (enfermaria: string) => {
      const res = await apiRequest("POST", "/api/import/evolucoes", {
        enfermaria,
      });
      const response = (await res.json()) as ImportResponse;
      return response;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
  });

  const handleImport = async () => {
    if (!selectedEnfermaria) return;
    await importMutation.mutateAsync(selectedEnfermaria);
  };

  const stats = result?.stats;
  const hasValidationErrors =
    stats && stats.importados + stats.erros > 0
      ? stats.erros > 0
        ? true
        : false
      : null;

  return (
    <div className="space-y-4">
      {/* Import Form */}
      <Card className="p-6" data-testid="card-import-form">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          Importar Evoluções do N8N
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Selecione a Enfermaria
            </label>
            <SelectPrimitive.Root
              value={selectedEnfermaria}
              onValueChange={setSelectedEnfermaria}
              disabled={isLoadingEnfermarias}
            >
              <SelectPrimitive.Trigger
                className="flex items-center justify-between w-full px-3 py-2 border rounded-md bg-background"
                data-testid="select-enfermaria"
              >
                <SelectPrimitive.Value placeholder="Selecione uma enfermaria..." />
                <ChevronDown className="w-4 h-4 opacity-50" />
              </SelectPrimitive.Trigger>
              <SelectPrimitive.Content className="border rounded-md bg-card shadow-md">
                <SelectPrimitive.Viewport className="p-2">
                  {enfermarias?.map((e) => (
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
            data-testid="button-import"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Importar Evoluções
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Result Card */}
      {result && (
        <Card
          className={`p-6 border-2 ${
            result.success ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
          } dark:bg-opacity-5`}
          data-testid="card-import-result"
        >
          <div className="flex items-start gap-3 mb-4">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">
                {result.success ? "Importação Concluída" : "Erro na Importação"}
              </h4>
              <p className="text-xs text-muted-foreground">{result.mensagem}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white dark:bg-card p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Total de Registros</p>
              <p className="text-2xl font-bold text-primary">
                {stats?.total || 0}
              </p>
            </div>

            <div className="bg-white dark:bg-card p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Importados</p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.importados || 0}
              </p>
            </div>

            {stats && stats.erros > 0 && (
              <>
                <div className="bg-white dark:bg-card p-3 rounded-lg border col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Erros ao Salvar</p>
                      <p className="text-2xl font-bold text-red-600">
                        {stats.erros}
                      </p>
                    </div>
                    {hasValidationErrors && (
                      <Badge
                        variant="destructive"
                        className="ml-2"
                        data-testid="badge-errors"
                      >
                        Erros encontrados
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Warnings */}
          {stats && stats.erros > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                  Alguns registros falharam na importação
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  {stats.erros} registro{stats.erros > 1 ? "s" : ""} não pôde{stats.erros > 1 ? "ram" : ""} ser salvos
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {result.success && stats && stats.erros === 0 && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-3 flex gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-green-800 dark:text-green-300">
                  Importação bem-sucedida!
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  Todos os {stats.total} registros foram importados com sucesso
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
