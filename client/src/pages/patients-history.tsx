import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { getAccessToken } from "@/lib/auth-token";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Home,
  Search,
  Filter,
  Calendar,
  User,
  Building,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Clock,
  ArrowUpRight,
  LogOut,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PatientsHistoryRecord {
  id: string;
  codigoAtendimento: string;
  registro: string | null;
  nome: string;
  leito: string;
  dataInternacao: string | null;
  dsEnfermaria: string | null;
  dsEspecialidade: string | null;
  motivoArquivamento: string;
  leitoDestino: string | null;
  dadosCompletos: Record<string, any>;
  clinicalInsights: Record<string, any> | null;
  notasPaciente: string | null;
  arquivadoEm: string;
}

interface PatientsHistoryResponse {
  success: boolean;
  data: PatientsHistoryRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface HistoryStats {
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

const motivoLabels: Record<string, { label: string; color: string }> = {
  alta_hospitalar: { label: "Alta Hospitalar", color: "bg-green-100 text-green-800" },
  transferencia_leito: { label: "Transferência", color: "bg-blue-100 text-blue-800" },
  obito: { label: "Óbito", color: "bg-gray-100 text-gray-800" },
  registro_antigo: { label: "Registro Antigo", color: "bg-yellow-100 text-yellow-800" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function PatientDetailsSheet({ record }: { record: PatientsHistoryRecord }) {
  const dados = record.dadosCompletos || {};
  const insights = record.clinicalInsights as any;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          Detalhes
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {record.nome}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          <div className="space-y-6 pr-4">
            {/* Informações Básicas */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Informações da Internação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Leito:</span>
                    <span className="ml-2 font-medium">{record.leito}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Registro (PT):</span>
                    <span className="ml-2 font-medium">{record.registro || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cód. Atendimento:</span>
                    <span className="ml-2 font-medium">{record.codigoAtendimento}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Enfermaria:</span>
                    <span className="ml-2 font-medium">{record.dsEnfermaria || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Especialidade:</span>
                    <span className="ml-2 font-medium">{record.dsEspecialidade || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data Internação:</span>
                    <span className="ml-2 font-medium">{record.dataInternacao || "-"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Motivo do Arquivamento */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Saída do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Motivo:</span>
                  <Badge className={motivoLabels[record.motivoArquivamento]?.color || "bg-gray-100"}>
                    {motivoLabels[record.motivoArquivamento]?.label || record.motivoArquivamento}
                  </Badge>
                </div>
                {record.leitoDestino && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Leito Destino:</span>
                    <span className="font-medium flex items-center gap-1">
                      {record.leito} <ArrowUpRight className="h-3 w-3" /> {record.leitoDestino}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <span className="ml-2 font-medium">{formatDate(record.arquivadoEm)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Dados Clínicos */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Dados Clínicos no Momento da Saída</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {dados.diagnostico && (
                  <div>
                    <span className="text-muted-foreground block">Diagnóstico:</span>
                    <span className="font-medium">{dados.diagnostico}</span>
                  </div>
                )}
                {dados.alergias && (
                  <div>
                    <span className="text-muted-foreground block">Alergias:</span>
                    <span className="font-medium text-red-600">{dados.alergias}</span>
                  </div>
                )}
                {dados.mobilidade && (
                  <div>
                    <span className="text-muted-foreground block">Mobilidade:</span>
                    <span className="font-medium">{dados.mobilidade}</span>
                  </div>
                )}
                {dados.dieta && (
                  <div>
                    <span className="text-muted-foreground block">Dieta:</span>
                    <span className="font-medium">{dados.dieta}</span>
                  </div>
                )}
                {dados.dispositivos && (
                  <div>
                    <span className="text-muted-foreground block">Dispositivos:</span>
                    <span className="font-medium">{dados.dispositivos}</span>
                  </div>
                )}
                {dados.atb && (
                  <div>
                    <span className="text-muted-foreground block">Antibióticos:</span>
                    <span className="font-medium">{dados.atb}</span>
                  </div>
                )}
                {dados.observacoes && (
                  <div>
                    <span className="text-muted-foreground block">Observações:</span>
                    <span className="font-medium">{dados.observacoes}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notas de Enfermagem */}
            {record.notasPaciente && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notas de Enfermagem
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{record.notasPaciente}</p>
                </CardContent>
              </Card>
            )}

            {/* Insights de IA */}
            {insights && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Análise Clínica (IA)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {insights.nivel_alerta && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Nível de Alerta:</span>
                      <Badge
                        className={
                          insights.nivel_alerta === "VERMELHO"
                            ? "bg-red-100 text-red-800"
                            : insights.nivel_alerta === "AMARELO"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }
                      >
                        {insights.nivel_alerta}
                      </Badge>
                    </div>
                  )}
                  {insights.principais_alertas && insights.principais_alertas.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Principais Alertas:</span>
                      <ul className="list-disc list-inside space-y-1">
                        {insights.principais_alertas.map((alerta: any, i: number) => {
                          const texto = typeof alerta === 'string' 
                            ? alerta 
                            : alerta?.titulo || alerta?.tipo || JSON.stringify(alerta);
                          const nivel = typeof alerta === 'object' ? alerta?.nivel : null;
                          const corTexto = nivel === 'VERMELHO' 
                            ? 'text-red-600' 
                            : nivel === 'AMARELO' 
                              ? 'text-yellow-600' 
                              : nivel === 'VERDE' 
                                ? 'text-green-600' 
                                : 'text-red-600';
                          return (
                            <li key={i} className={corTexto}>{texto}</li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default function PatientsHistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [motivoFilter, setMotivoFilter] = useState<string>("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<"24h" | "7d" | "30d" | null>(null);
  const limit = 20;

  const applyPeriodFilter = (period: "24h" | "7d" | "30d") => {
    if (periodFilter === period) {
      setPeriodFilter(null);
      setDataInicio("");
      setDataFim("");
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
    
    setDataInicio(startDate.toISOString().split("T")[0]);
    setDataFim("");
    setPeriodFilter(period);
    setPage(1);
  };

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    if (searchTerm) {
      // Search in nome, registro, or leito
      params.set("nome", searchTerm);
    }
    if (motivoFilter && motivoFilter !== "all") {
      params.set("motivoArquivamento", motivoFilter);
    }
    if (dataInicio) {
      params.set("dataInicio", new Date(dataInicio).toISOString());
    }
    if (dataFim) {
      params.set("dataFim", new Date(dataFim).toISOString());
    }

    return params.toString();
  }, [page, searchTerm, motivoFilter, dataInicio, dataFim]);

  // Fetch history data
  const { data: historyData, isLoading, refetch } = useQuery<PatientsHistoryResponse>({
    queryKey: ["/api/patients-history", queryParams],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      const token = getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/patients-history?${queryParams}`, {
        credentials: "include",
        headers,
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery<HistoryStats>({
    queryKey: ["/api/patients-history/stats"],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      const token = getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/patients-history/stats", {
        credentials: "include",
        headers,
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const stats = statsData?.data;
  const records = historyData?.data || [];
  const totalPages = historyData?.totalPages || 1;
  const total = historyData?.total || 0;

  const reactivateMutation = useMutation({
    mutationFn: async (historyId: string) => {
      const response = await apiRequest("POST", `/api/patients-history/${historyId}/reactivate`);
      return response.json();
    },
    onMutate: (historyId) => {
      setReactivatingId(historyId);
    },
    onSuccess: async (data) => {
      toast({
        title: "Paciente Reativado",
        description: data.message || "Paciente foi reativado e voltou para a passagem de plantão.",
      });
      await queryClient.refetchQueries({ queryKey: ["/api/patients-history"] });
      await queryClient.refetchQueries({ queryKey: ["/api/patients-history/stats"] });
      await queryClient.refetchQueries({ queryKey: ["/api/patients"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Reativar",
        description: error.message || "Não foi possível reativar o paciente.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setReactivatingId(null);
    },
  });

  const handleReactivate = (record: PatientsHistoryRecord) => {
    if (confirm(`Deseja reativar o paciente ${record.nome}? Ele voltará para a passagem de plantão.`)) {
      reactivateMutation.mutate(record.id);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setMotivoFilter("all");
    setDataInicio("");
    setDataFim("");
    setPeriodFilter(null);
    setPage(1);
  };

  const hasActiveFilters = searchTerm || motivoFilter !== "all" || dataInicio || dataFim || periodFilter;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-card border-b-4 border-primary shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-5 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Link href="/shift-handover">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Passagem de Plantão
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-8" />
              <div>
                <h1 className="text-xl font-bold text-primary">Histórico de Pacientes</h1>
                <p className="text-sm text-muted-foreground">
                  Consulte pacientes que receberam alta ou foram transferidos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    Ativo
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-5 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total no Histórico</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer hover-elevate ${periodFilter === "24h" ? "ring-2 ring-primary" : ""}`}
              onClick={() => applyPeriodFilter("24h")}
              data-testid="card-filter-24h"
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Últimas 24h</p>
                    <p className="text-2xl font-bold">{stats.last24h}</p>
                  </div>
                  <Clock className={`h-8 w-8 ${periodFilter === "24h" ? "text-primary" : "text-muted-foreground/50"}`} />
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer hover-elevate ${periodFilter === "7d" ? "ring-2 ring-primary" : ""}`}
              onClick={() => applyPeriodFilter("7d")}
              data-testid="card-filter-7d"
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
                    <p className="text-2xl font-bold">{stats.last7d}</p>
                  </div>
                  <Calendar className={`h-8 w-8 ${periodFilter === "7d" ? "text-primary" : "text-muted-foreground/50"}`} />
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer hover-elevate ${periodFilter === "30d" ? "ring-2 ring-primary" : ""}`}
              onClick={() => applyPeriodFilter("30d")}
              data-testid="card-filter-30d"
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
                    <p className="text-2xl font-bold">{stats.last30d}</p>
                  </div>
                  <Building className={`h-8 w-8 ${periodFilter === "30d" ? "text-primary" : "text-muted-foreground/50"}`} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar (nome, registro, leito)</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Digite para buscar..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivo">Motivo da Saída</Label>
                  <Select
                    value={motivoFilter}
                    onValueChange={(value: string) => {
                      setMotivoFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger id="motivo">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="alta_hospitalar">Alta Hospitalar</SelectItem>
                      <SelectItem value="transferencia_leito">Transferência</SelectItem>
                      <SelectItem value="obito">Óbito</SelectItem>
                      <SelectItem value="registro_antigo">Registro Antigo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataInicio">Data Início</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => {
                      setDataInicio(e.target.value);
                      setPeriodFilter(null);
                      setPage(1);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataFim">Data Fim</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => {
                      setDataFim(e.target.value);
                      setPeriodFilter(null);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results Table */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Registros de Histórico
                {total > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({total} {total === 1 ? "registro" : "registros"})
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Carregando...</span>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p className="text-lg">Nenhum registro encontrado</p>
                {hasActiveFilters && (
                  <p className="text-sm">Tente ajustar os filtros de busca</p>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Leito</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="w-[100px]">Registro</TableHead>
                        <TableHead className="w-[120px]">Enfermaria</TableHead>
                        <TableHead className="w-[140px]">Motivo</TableHead>
                        <TableHead className="w-[150px]">Data Saída</TableHead>
                        <TableHead className="w-[100px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.leito}</TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate" title={record.nome}>
                              {record.nome}
                            </div>
                          </TableCell>
                          <TableCell>{record.registro || "-"}</TableCell>
                          <TableCell>{record.dsEnfermaria || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                motivoLabels[record.motivoArquivamento]?.color || "bg-gray-100"
                              }
                            >
                              {motivoLabels[record.motivoArquivamento]?.label ||
                                record.motivoArquivamento}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(record.arquivadoEm)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <PatientDetailsSheet record={record} />
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReactivate(record)}
                                  disabled={reactivatingId === record.id}
                                  title="Reativar paciente"
                                  data-testid={`button-reactivate-${record.id}`}
                                >
                                  {reactivatingId === record.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-4 w-4" />
                                  )}
                                  <span className="ml-1 hidden sm:inline">Reativar</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
