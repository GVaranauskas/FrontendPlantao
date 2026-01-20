import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  History, Search, Calendar, User, Bed, 
  ArrowRightLeft, LogOut, AlertCircle, Clock,
  ChevronLeft, ChevronRight, FileText
} from "lucide-react";
import type { PatientsHistory } from "@shared/schema";
import { getAccessToken } from "@/lib/auth-token";

interface PatientsHistoryResponse {
  success: boolean;
  data: PatientsHistory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface StatsResponse {
  success: boolean;
  data: {
    total: number;
    last24h: number;
    last7d: number;
    last30d: number;
    byMotivo: Record<string, number>;
    byEnfermaria: Record<string, number>;
  };
}

const motivoLabels: Record<string, { label: string; icon: typeof LogOut; color: string }> = {
  alta_hospitalar: { label: "Alta Hospitalar", icon: LogOut, color: "bg-green-500" },
  transferencia_leito: { label: "Transferência", icon: ArrowRightLeft, color: "bg-blue-500" },
  obito: { label: "Óbito", icon: AlertCircle, color: "bg-gray-500" },
  registro_antigo: { label: "Registro Antigo", icon: Clock, color: "bg-orange-500" },
};

export function PatientHistorySheet() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [motivoFilter, setMotivoFilter] = useState<string>("all");
  const [selectedRecord, setSelectedRecord] = useState<PatientsHistory | null>(null);
  const [periodFilter, setPeriodFilter] = useState<"24h" | "7d" | "30d" | null>(null);
  const [dataInicio, setDataInicio] = useState("");

  const applyPeriodFilter = (period: "24h" | "7d" | "30d") => {
    if (periodFilter === period) {
      setPeriodFilter(null);
      setDataInicio("");
      setPage(1);
      return;
    }
    
    const now = new Date();
    let startDate: Date;
    
    if (period === "24h") {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    setDataInicio(startDate.toISOString());
    setPeriodFilter(period);
    setPage(1);
  };

  const { data: statsData, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/patients-history/stats"],
    enabled: open,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<PatientsHistoryResponse>({
    queryKey: ["/api/patients-history", page, searchTerm, motivoFilter, dataInicio],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (searchTerm) params.set("nome", searchTerm);
      if (motivoFilter && motivoFilter !== "all") params.set("motivoArquivamento", motivoFilter);
      if (dataInicio) params.set("dataInicio", dataInicio);
      
      const headers: Record<string, string> = {};
      const token = getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/patients-history?${params}`, {
        credentials: "include",
        headers,
      });
      if (!response.ok) throw new Error("Erro ao buscar histórico");
      return response.json();
    },
    enabled: open,
  });

  const stats = statsData?.data;
  const records = historyData?.data || [];
  const totalPages = historyData?.totalPages || 1;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative"
          data-testid="button-history"
        >
          <History className="w-5 h-5" />
          {stats && stats.total > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-bold">
              {stats.total > 99 ? "99+" : stats.total}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Pacientes
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {statsLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : stats && (
            <div className="grid grid-cols-4 gap-2">
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </Card>
              <Card 
                className={`p-3 text-center cursor-pointer hover-elevate ${periodFilter === "24h" ? "ring-2 ring-primary" : ""}`}
                onClick={() => applyPeriodFilter("24h")}
                data-testid="card-filter-24h"
              >
                <div className={`text-2xl font-bold ${periodFilter === "24h" ? "text-primary" : "text-green-600"}`}>{stats.last24h}</div>
                <div className="text-xs text-muted-foreground">Últimas 24h</div>
              </Card>
              <Card 
                className={`p-3 text-center cursor-pointer hover-elevate ${periodFilter === "7d" ? "ring-2 ring-primary" : ""}`}
                onClick={() => applyPeriodFilter("7d")}
                data-testid="card-filter-7d"
              >
                <div className={`text-2xl font-bold ${periodFilter === "7d" ? "text-primary" : "text-blue-600"}`}>{stats.last7d}</div>
                <div className="text-xs text-muted-foreground">Últimos 7 dias</div>
              </Card>
              <Card 
                className={`p-3 text-center cursor-pointer hover-elevate ${periodFilter === "30d" ? "ring-2 ring-primary" : ""}`}
                onClick={() => applyPeriodFilter("30d")}
                data-testid="card-filter-30d"
              >
                <div className={`text-2xl font-bold ${periodFilter === "30d" ? "text-primary" : "text-purple-600"}`}>{stats.last30d}</div>
                <div className="text-xs text-muted-foreground">Últimos 30 dias</div>
              </Card>
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
                data-testid="input-search-history"
              />
            </div>
            <Select 
              value={motivoFilter} 
              onValueChange={(value) => {
                setMotivoFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-motivo-filter">
                <SelectValue placeholder="Todos os motivos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motivos</SelectItem>
                <SelectItem value="alta_hospitalar">Alta Hospitalar</SelectItem>
                <SelectItem value="transferencia_leito">Transferência</SelectItem>
                <SelectItem value="obito">Óbito</SelectItem>
                <SelectItem value="registro_antigo">Registro Antigo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedRecord ? (
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedRecord(null)}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>
              
              <Card className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedRecord.nome}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Bed className="w-4 h-4" />
                      Leito {selectedRecord.leito}
                      {selectedRecord.registro && (
                        <>
                          <span className="mx-1">•</span>
                          <User className="w-4 h-4" />
                          PT: {selectedRecord.registro}
                        </>
                      )}
                    </div>
                  </div>
                  <Badge className={`${motivoLabels[selectedRecord.motivoArquivamento]?.color || "bg-gray-500"} text-white`}>
                    {motivoLabels[selectedRecord.motivoArquivamento]?.label || selectedRecord.motivoArquivamento}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Código Atendimento</div>
                    <div className="font-medium">{selectedRecord.codigoAtendimento}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Data Internação</div>
                    <div className="font-medium">{selectedRecord.dataInternacao || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Enfermaria</div>
                    <div className="font-medium">{selectedRecord.dsEnfermaria || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Especialidade</div>
                    <div className="font-medium">{selectedRecord.dsEspecialidade || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Arquivado em</div>
                    <div className="font-medium">
                      {selectedRecord.arquivadoEm 
                        ? format(new Date(selectedRecord.arquivadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : "-"
                      }
                    </div>
                  </div>
                  {selectedRecord.leitoDestino && (
                    <div>
                      <div className="text-muted-foreground">Leito Destino</div>
                      <div className="font-medium">{selectedRecord.leitoDestino}</div>
                    </div>
                  )}
                </div>

                {selectedRecord.notasPaciente && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <FileText className="w-4 h-4" />
                      Notas de Enfermagem
                    </div>
                    <div className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                      {selectedRecord.notasPaciente}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[400px]">
                {historyLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : records.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <History className="w-12 h-12 mb-2 opacity-50" />
                    <p>Nenhum registro encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    {records.map((record) => {
                      const motivoInfo = motivoLabels[record.motivoArquivamento] || {
                        label: record.motivoArquivamento,
                        icon: Clock,
                        color: "bg-gray-500",
                      };
                      const MotivoIcon = motivoInfo.icon;

                      return (
                        <Card 
                          key={record.id}
                          className="p-3 cursor-pointer hover-elevate"
                          onClick={() => setSelectedRecord(record)}
                          data-testid={`history-record-${record.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{record.nome}</span>
                                <Badge variant="outline" className="text-xs">
                                  <Bed className="w-3 h-3 mr-1" />
                                  {record.leito}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                {record.registro && (
                                  <span>PT: {record.registro}</span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {record.arquivadoEm 
                                    ? format(new Date(record.arquivadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                    : "-"
                                  }
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${motivoInfo.color} text-white text-xs`}>
                                <MotivoIcon className="w-3 h-3 mr-1" />
                                {motivoInfo.label}
                              </Badge>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
