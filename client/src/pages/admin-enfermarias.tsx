import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  Edit,
  RefreshCcw,
  Search,
  Loader2,
  Check,
  X,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Enfermaria {
  id: string;
  idExterno: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ramal: string | null;
  localizacao: string | null;
  responsavel: string | null;
  capacidadeLeitos: number | null;
  observacoes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
}

interface PendingSync {
  id: string;
  idExterno: number;
  codigo: string;
  nome: string;
  changeType: "insert" | "update";
  changesJson: Record<string, { from: string; to: string }> | null;
  originalDataJson: Record<string, unknown> | null;
  newDataJson: Record<string, unknown> | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
}

export default function AdminEnfermariasPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEnfermaria, setEditingEnfermaria] = useState<Enfermaria | null>(null);
  const [showPendingPanel, setShowPendingPanel] = useState(false);

  const { data: enfermarias, isLoading } = useQuery<Enfermaria[]>({
    queryKey: ["/api/enfermarias"],
  });

  const { data: pendingSync, refetch: refetchPending } = useQuery<PendingSync[]>({
    queryKey: ["/api/enfermarias/sync/pending"],
  });

  const updateEnfermaria = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Enfermaria> }) => {
      const res = await apiRequest("PATCH", `/api/enfermarias/${data.id}`, data.updates);
      if (!res.ok) throw new Error("Erro ao atualizar enfermaria");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enfermarias"] });
      setEditingEnfermaria(null);
      toast({ title: "Enfermaria atualizada com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar enfermaria", variant: "destructive" });
    },
  });

  const checkSync = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/enfermarias/sync/check");
      if (!res.ok) throw new Error("Erro ao verificar sincronização");
      return res.json();
    },
    onSuccess: (data) => {
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/enfermarias"] });
      toast({ 
        title: data.noChanges ? "Nenhuma alteração encontrada" : "Alterações pendentes encontradas",
        description: data.message 
      });
    },
    onError: () => {
      toast({ title: "Erro ao verificar sincronização", variant: "destructive" });
    },
  });

  const approveChange = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/enfermarias/sync/${id}/approve`);
      if (!res.ok) throw new Error("Erro ao aprovar alteração");
      return res.json();
    },
    onSuccess: () => {
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/enfermarias"] });
      toast({ title: "Alteração aprovada com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao aprovar alteração", variant: "destructive" });
    },
  });

  const rejectChange = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/enfermarias/sync/${id}/reject`);
      if (!res.ok) throw new Error("Erro ao rejeitar alteração");
      return res.json();
    },
    onSuccess: () => {
      refetchPending();
      toast({ title: "Alteração rejeitada" });
    },
    onError: () => {
      toast({ title: "Erro ao rejeitar alteração", variant: "destructive" });
    },
  });

  const approveAll = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/enfermarias/sync/approve-all");
      if (!res.ok) throw new Error("Erro ao aprovar todas");
      return res.json();
    },
    onSuccess: (data) => {
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ["/api/enfermarias"] });
      toast({ title: `${data.approved} alterações aprovadas` });
    },
    onError: () => {
      toast({ title: "Erro ao aprovar todas", variant: "destructive" });
    },
  });

  const filteredEnfermarias = enfermarias?.filter(
    (e) =>
      e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = pendingSync?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b-4 border-primary shadow-md sticky top-0 z-50">
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
                <Building2 className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-primary">
                    Administração de Enfermarias
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Gerencie as unidades de internação e sincronização
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowPendingPanel(true)}
                  className="relative"
                  data-testid="button-pending-sync"
                >
                  <AlertTriangle className="w-4 h-4 mr-2 text-chart-3" />
                  {pendingCount} Pendentes
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => checkSync.mutate()}
                disabled={checkSync.isPending}
                data-testid="button-check-sync"
              >
                {checkSync.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4 mr-2" />
                )}
                Verificar Sincronização
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-5 py-6">
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-enfermaria"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredEnfermarias?.length || 0} enfermarias
            </div>
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5">
                  <TableHead className="font-semibold">Código</TableHead>
                  <TableHead className="font-semibold">Nome</TableHead>
                  <TableHead className="font-semibold">Ramal</TableHead>
                  <TableHead className="font-semibold">Localização</TableHead>
                  <TableHead className="font-semibold">Responsável</TableHead>
                  <TableHead className="font-semibold">Leitos</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnfermarias?.map((enfermaria) => (
                  <TableRow key={enfermaria.id} data-testid={`row-enfermaria-${enfermaria.id}`}>
                    <TableCell className="font-mono font-medium">
                      {enfermaria.codigo}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{enfermaria.nome}</div>
                        {enfermaria.descricao && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {enfermaria.descricao}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{enfermaria.ramal || "-"}</TableCell>
                    <TableCell>{enfermaria.localizacao || "-"}</TableCell>
                    <TableCell>{enfermaria.responsavel || "-"}</TableCell>
                    <TableCell>{enfermaria.capacidadeLeitos || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={enfermaria.isActive ? "default" : "secondary"}>
                        {enfermaria.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingEnfermaria(enfermaria)}
                        data-testid={`button-edit-${enfermaria.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        <Card className="mt-6 p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              Sincronização automática: diariamente às 03:00
            </span>
          </div>
        </Card>
      </main>

      <Dialog open={!!editingEnfermaria} onOpenChange={() => setEditingEnfermaria(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Enfermaria
            </DialogTitle>
          </DialogHeader>
          {editingEnfermaria && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateEnfermaria.mutate({
                  id: editingEnfermaria.id,
                  updates: {
                    descricao: formData.get("descricao") as string || null,
                    ramal: formData.get("ramal") as string || null,
                    localizacao: formData.get("localizacao") as string || null,
                    responsavel: formData.get("responsavel") as string || null,
                    capacidadeLeitos: formData.get("capacidadeLeitos") 
                      ? parseInt(formData.get("capacidadeLeitos") as string) 
                      : null,
                    observacoes: formData.get("observacoes") as string || null,
                  },
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Código</label>
                  <Input value={editingEnfermaria.codigo} disabled className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Nome</label>
                  <Input value={editingEnfermaria.nome} disabled className="mt-1" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Input
                  name="descricao"
                  defaultValue={editingEnfermaria.descricao || ""}
                  placeholder="Descrição da unidade..."
                  className="mt-1"
                  data-testid="input-descricao"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Ramal</label>
                  <Input
                    name="ramal"
                    defaultValue={editingEnfermaria.ramal || ""}
                    placeholder="Ex: 1234"
                    className="mt-1"
                    data-testid="input-ramal"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Capacidade de Leitos</label>
                  <Input
                    name="capacidadeLeitos"
                    type="number"
                    defaultValue={editingEnfermaria.capacidadeLeitos || ""}
                    placeholder="Ex: 20"
                    className="mt-1"
                    data-testid="input-leitos"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Localização</label>
                <Input
                  name="localizacao"
                  defaultValue={editingEnfermaria.localizacao || ""}
                  placeholder="Ex: Bloco A, 2º andar"
                  className="mt-1"
                  data-testid="input-localizacao"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Responsável</label>
                <Input
                  name="responsavel"
                  defaultValue={editingEnfermaria.responsavel || ""}
                  placeholder="Nome do enfermeiro responsável"
                  className="mt-1"
                  data-testid="input-responsavel"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  name="observacoes"
                  defaultValue={editingEnfermaria.observacoes || ""}
                  placeholder="Observações adicionais..."
                  className="mt-1"
                  rows={3}
                  data-testid="input-observacoes"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingEnfermaria(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateEnfermaria.isPending}>
                  {updateEnfermaria.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPendingPanel} onOpenChange={setShowPendingPanel}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-chart-3" />
              Alterações Pendentes de Aprovação
            </DialogTitle>
          </DialogHeader>

          {pendingSync && pendingSync.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => approveAll.mutate()}
                  disabled={approveAll.isPending}
                  data-testid="button-approve-all"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprovar Todas
                </Button>
              </div>

              {pendingSync.map((sync) => (
                <Card key={sync.id} className="p-4" data-testid={`pending-${sync.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={sync.changeType === "insert" ? "default" : "secondary"}>
                          {sync.changeType === "insert" ? "Nova" : "Atualização"}
                        </Badge>
                        <span className="font-medium">{sync.nome}</span>
                        <span className="text-sm text-muted-foreground">({sync.codigo})</span>
                      </div>

                      {sync.changeType === "update" && sync.changesJson && (
                        <div className="text-sm space-y-1 bg-muted/50 p-2 rounded">
                          {Object.entries(sync.changesJson).map(([field, change]) => (
                            <div key={field}>
                              <span className="font-medium">{field}:</span>{" "}
                              <span className="text-destructive line-through">{change.from}</span>
                              {" → "}
                              <span className="text-chart-2">{change.to}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground mt-2">
                        Detectado em: {new Date(sync.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => approveChange.mutate(sync.id)}
                        disabled={approveChange.isPending}
                        className="text-chart-2 hover:text-chart-2"
                        data-testid={`button-approve-${sync.id}`}
                      >
                        <CheckCircle className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => rejectChange.mutate(sync.id)}
                        disabled={rejectChange.isPending}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-reject-${sync.id}`}
                      >
                        <XCircle className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma alteração pendente</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
