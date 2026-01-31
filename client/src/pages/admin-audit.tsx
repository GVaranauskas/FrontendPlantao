import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Filter,
  Clock,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string | null;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId: string | null;
  changes: string | null;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  endpoint: string | null;
  statusCode: number;
  errorMessage: string | null;
  duration: number;
}

interface AuditResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_OPTIONS = [
  { value: "all", label: "Todas as Ações" },
  { value: "CREATE", label: "Criar" },
  { value: "READ", label: "Leitura" },
  { value: "UPDATE", label: "Atualizar" },
  { value: "DELETE", label: "Deletar" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "EXPORT", label: "Exportar" },
  { value: "IMPORT", label: "Importar" },
  { value: "PATIENT_ARCHIVED", label: "Paciente Arquivado" },
  { value: "PATIENT_REACTIVATED", label: "Paciente Reativado" },
  { value: "BED_CONFLICT", label: "Conflito de Leito" },
  { value: "SHIFT_HANDOVER_VIEW", label: "Visualização Plantão" },
  { value: "SHIFT_HANDOVER_PRINT", label: "Impressão Plantão" },
  { value: "SYNC_STARTED", label: "Sincronização Iniciada" },
  { value: "SYNC_COMPLETED", label: "Sincronização Completa" },
];

const RESOURCE_OPTIONS = [
  { value: "all", label: "Todos os Recursos" },
  { value: "patient", label: "Paciente" },
  { value: "user", label: "Usuário" },
  { value: "nursing_unit", label: "Unidade Enfermagem" },
  { value: "shift_handover", label: "Passagem Plantão" },
  { value: "template", label: "Template" },
  { value: "sync", label: "Sincronização" },
  { value: "session", label: "Sessão" },
];

function getActionBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("DELETE") || action.includes("ARCHIVED")) return "destructive";
  if (action.includes("CREATE") || action.includes("REACTIVATED")) return "default";
  if (action.includes("UPDATE")) return "secondary";
  return "outline";
}

function getStatusIcon(statusCode: number) {
  if (statusCode >= 200 && statusCode < 300) {
    return <CheckCircle className="h-4 w-4 text-chart-2" />;
  }
  if (statusCode >= 400 && statusCode < 500) {
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  }
  if (statusCode >= 500) {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

function parseJsonSafe(str: string | null): Record<string, unknown> | null {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function ExpandableDetails({ changes, metadata }: { changes: string | null; metadata: string | null }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const parsedChanges = parseJsonSafe(changes);
  const parsedMetadata = parseJsonSafe(metadata);

  if (!parsedChanges && !parsedMetadata) return null;

  return (
    <div className="mt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-6 px-2 text-xs"
        data-testid="button-expand-details"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-3 w-3 mr-1" />
            Ocultar Detalhes
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3 mr-1" />
            Ver Detalhes
          </>
        )}
      </Button>
      {isExpanded && (
        <div className="mt-2 p-3 bg-muted rounded-md text-xs space-y-2">
          {parsedChanges && (
            <div>
              <span className="font-semibold text-muted-foreground">Alterações:</span>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(parsedChanges, null, 2)}
              </pre>
            </div>
          )}
          {parsedMetadata && (
            <div>
              <span className="font-semibold text-muted-foreground">Metadados:</span>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(parsedMetadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAuditPage() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (actionFilter && actionFilter !== "all") params.set("action", actionFilter);
    if (resourceFilter && resourceFilter !== "all") params.set("resource", resourceFilter);
    if (userFilter) params.set("userId", userFilter);
    if (startDate) params.set("startDate", new Date(startDate).toISOString());
    if (endDate) params.set("endDate", new Date(endDate).toISOString());
    return params.toString();
  }, [page, limit, actionFilter, resourceFilter, userFilter, startDate, endDate]);

  const { data: auditData, isLoading, refetch, isFetching } = useQuery<AuditResponse>({
    queryKey: [`/api/admin/audit?${queryParams}`],
  });

  const { data: usersData } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/users"],
  });

  const users = useMemo(() => {
    if (!usersData) return [];
    return usersData.map((u) => ({ id: u.id, name: u.name }));
  }, [usersData]);

  const handleClearFilters = () => {
    setActionFilter("all");
    setResourceFilter("all");
    setUserFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    } catch {
      return timestamp;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="min-h-screen bg-background" data-testid="admin-audit-page">
      <header className="bg-card border-b-4 border-primary shadow-md">
        <div className="container mx-auto px-5 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-primary">Trilhas de Auditoria</h1>
                  <p className="text-sm text-muted-foreground">
                    Registro de todas as ações do sistema
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-5 py-6 space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  Ação
                </label>
                <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                  <SelectTrigger data-testid="select-action">
                    <SelectValue placeholder="Todas as Ações" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Recurso
                </label>
                <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v); setPage(1); }}>
                  <SelectTrigger data-testid="select-resource">
                    <SelectValue placeholder="Todos os Recursos" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Usuário
                </label>
                <Select value={userFilter || "all"} onValueChange={(v) => { setUserFilter(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger data-testid="select-user">
                    <SelectValue placeholder="Todos os Usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Usuários</SelectItem>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Data Início
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  data-testid="input-start-date"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Data Fim
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  data-testid="input-end-date"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={handleClearFilters} data-testid="button-clear-filters">
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-lg">
                Registros de Auditoria
              </CardTitle>
              {auditData && (
                <span className="text-sm text-muted-foreground">
                  {auditData.total} registros encontrados
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !auditData?.data?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum registro de auditoria encontrado
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Timestamp</TableHead>
                        <TableHead className="min-w-[120px]">Usuário</TableHead>
                        <TableHead className="min-w-[120px]">Ação</TableHead>
                        <TableHead className="min-w-[100px]">Recurso</TableHead>
                        <TableHead className="min-w-[100px]">ID Recurso</TableHead>
                        <TableHead className="min-w-[100px]">IP</TableHead>
                        <TableHead className="min-w-[150px]">Endpoint</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                        <TableHead className="min-w-[80px]">Duração</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditData.data.map((entry) => (
                        <TableRow key={entry.id} data-testid={`audit-row-${entry.id}`}>
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              {formatTimestamp(entry.timestamp)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{entry.userName}</span>
                              <span className="text-xs text-muted-foreground">{entry.userRole}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(entry.action)}>
                              {entry.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{entry.resource}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {entry.resourceId ? (
                              <span className="truncate max-w-[100px] block" title={entry.resourceId}>
                                {entry.resourceId.substring(0, 8)}...
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {entry.ipAddress || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <span className="truncate max-w-[150px] block" title={entry.endpoint || ""}>
                              {entry.endpoint || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(entry.statusCode)}
                              <span className="text-xs font-mono">{entry.statusCode}</span>
                            </div>
                            {entry.errorMessage && (
                              <span className="text-xs text-destructive block mt-1 truncate max-w-[100px]" title={entry.errorMessage}>
                                {entry.errorMessage}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatDuration(entry.duration)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {auditData.data.map((entry) => (
                  (entry.changes || entry.metadata) && (
                    <div key={`details-${entry.id}`} className="border-t py-2 px-4">
                      <div className="text-xs text-muted-foreground mb-1">
                        {formatTimestamp(entry.timestamp)} - {entry.userName} - {entry.action}
                      </div>
                      <ExpandableDetails changes={entry.changes} metadata={entry.metadata} />
                    </div>
                  )
                ))}

                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {auditData.page} de {auditData.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= (auditData?.totalPages || 1)}
                      data-testid="button-next-page"
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
