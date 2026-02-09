import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Home, AlertTriangle } from "lucide-react";
import { ShiftIndicators, LevelClassification } from "@/components/shift-handover";
import type { IndicadoresPlantao } from "@/types";

interface ShiftSummaryResponse {
  total: number;
  summary: { vermelho: number; amarelo: number; verde: number; semAnalise: number };
  indicadores: IndicadoresPlantao | null;
  hasAnalysis: boolean;
}

export default function ShiftOverviewPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<ShiftSummaryResponse>({
    queryKey: ["/api/shift-summary"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-shift-overview">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4" data-testid="error-shift-overview">
        <Card className="p-6 max-w-md text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">Não foi possível carregar os dados do plantão.</p>
          <Button variant="outline" onClick={() => setLocation("/modules")} data-testid="button-back-modules">
            <Home className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-shift-overview">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold" data-testid="text-page-title">Visão Geral do Plantão</h1>
            <p className="text-sm text-muted-foreground">Resumo dos indicadores e classificação dos pacientes</p>
          </div>
        </div>

        {!data?.hasAnalysis && (
          <Card className="p-6 text-center space-y-2" data-testid="card-no-analysis">
            <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto" />
            <p className="text-sm font-medium">Nenhuma análise clínica disponível</p>
            <p className="text-xs text-muted-foreground">
              Execute a Análise Clínica por Leito na tela de Passagem de Plantão para gerar os indicadores.
            </p>
          </Card>
        )}

        {data?.hasAnalysis && (
          <div className="space-y-4">
            {data.indicadores && (
              <ShiftIndicators indicadores={data.indicadores} />
            )}

            <LevelClassification
              vermelho={data.summary.vermelho}
              amarelo={data.summary.amarelo}
              verde={data.summary.verde}
              total={data.total}
            />
          </div>
        )}
      </div>
    </div>
  );
}
