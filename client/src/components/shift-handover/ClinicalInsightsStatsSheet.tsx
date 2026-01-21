import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, Copy, Check, AlertTriangle, AlertCircle, 
  CheckCircle, Users, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClinicalInsightsStats {
  success: boolean;
  environment: string;
  timestamp: string;
  summary: {
    total: number;
    comInsights: number;
    comAlertas: number;
    criticos: number;
    alertas: number;
    verdes: number;
  };
  detalhes: Array<{
    leito: string;
    nome: string;
    nivel: string;
    alertasCount: { verde: number; amarelo: number; vermelho: number };
  }>;
}

export function ClinicalInsightsStatsSheet() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data, isLoading, refetch, isFetching, isError } = useQuery<ClinicalInsightsStats>({
    queryKey: ["/api/stats/clinical-insights"],
    enabled: open,
  });

  const copyToClipboard = async () => {
    if (!data) return;
    
    const jsonData = JSON.stringify({
      environment: data.environment,
      timestamp: data.timestamp,
      summary: data.summary,
      detalhes: data.detalhes,
    }, null, 2);

    try {
      await navigator.clipboard.writeText(jsonData);
      setCopied(true);
      toast({
        title: "Copiado!",
        description: "Dados copiados para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar os dados.",
        variant: "destructive",
      });
    }
  };

  const summary = data?.summary;
  const detalhes = data?.detalhes || [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative"
          data-testid="button-clinical-stats"
          title="Estatísticas de Alertas Clínicos (DEV/PROD)"
        >
          <BarChart3 className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Estatísticas de Alertas
            {data?.environment && (
              <Badge variant={data.environment === "PROD" ? "default" : "secondary"}>
                {data.environment}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4">
        <div className="space-y-4 pr-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Compare estes dados entre DEV e PROD
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                disabled={!data || isLoading}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1 text-green-500" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar JSON
                  </>
                )}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
              <Skeleton className="h-48" />
            </div>
          ) : isError ? (
            <Card className="p-4 text-center">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">Erro ao carregar estatísticas</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                Tentar novamente
              </Button>
            </Card>
          ) : summary && (
            <>
              <div className="grid grid-cols-4 gap-2">
                <Card className="p-3 text-center">
                  <div className="flex justify-center mb-1">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{summary.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </Card>
                <Card className="p-3 text-center border-red-200 bg-red-50">
                  <div className="flex justify-center mb-1">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="text-2xl font-bold text-red-600">{summary.criticos}</div>
                  <div className="text-xs text-red-600">Críticos</div>
                </Card>
                <Card className="p-3 text-center border-yellow-200 bg-yellow-50">
                  <div className="flex justify-center mb-1">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">{summary.alertas}</div>
                  <div className="text-xs text-yellow-600">Alertas</div>
                </Card>
                <Card className="p-3 text-center border-green-200 bg-green-50">
                  <div className="flex justify-center mb-1">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{summary.verdes}</div>
                  <div className="text-xs text-green-600">OK</div>
                </Card>
              </div>

              {data?.timestamp && (
                <p className="text-xs text-muted-foreground text-center">
                  Atualizado em: {new Date(data.timestamp).toLocaleString("pt-BR")}
                </p>
              )}

              <Card className="p-3">
                <h4 className="font-medium text-sm mb-2">Detalhes por Paciente</h4>
                <ScrollArea className="h-[280px]">
                  <div className="space-y-1 pr-4">
                    {detalhes.map((d, i) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className="text-xs font-mono w-10 justify-center"
                          >
                            {d.leito}
                          </Badge>
                          <span className="text-sm truncate max-w-[180px]">{d.nome}</span>
                        </div>
                        <Badge 
                          className={`text-xs ${
                            d.nivel === "VERMELHO" 
                              ? "bg-red-500" 
                              : d.nivel === "AMARELO" 
                                ? "bg-yellow-500 text-yellow-900" 
                                : "bg-green-500"
                          }`}
                        >
                          {d.nivel}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="p-3 bg-muted/50">
                <h4 className="font-medium text-sm mb-2">Como comparar DEV vs PROD</h4>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Clique em "Copiar JSON" neste ambiente</li>
                  <li>Acesse o outro ambiente (PROD ou DEV)</li>
                  <li>Abra esta mesma tela e compare os valores</li>
                  <li>Use os JSONs para identificar diferenças</li>
                </ol>
              </Card>
            </>
          )}
        </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
