import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCrudMutations } from "@/hooks/use-crud-mutations";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Check,
  X,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NursingUnit {
  id: string;
  externalId: number | null;
  codigo: string;
  nome: string;
  localizacao: string | null;
  descricao: string | null;
  observacoes: string | null;
  ramal: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NursingUnitChange {
  id: string;
  unitId: string | null;
  externalId: number;
  changeType: "create" | "update";
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  newData: Record<string, unknown> | null;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  unchanged: number;
  pendingApproval: number;
  errors: string[];
  timestamp: string;
}

export default function AdminNursingUnitsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<NursingUnit | null>(null);
  const [activeTab, setActiveTab] = useState<"units" | "pending">("units");

  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    localizacao: "",
    descricao: "",
    observacoes: "",
    ramal: "",
    ativo: true,
  });

  const { data: units, isLoading: unitsLoading } = useQuery<NursingUnit[]>({
    queryKey: ["/api/nursing-units"],
  });

  const { data: pendingChanges, isLoading: changesLoading } = useQuery<NursingUnitChange[]>({
    queryKey: ["/api/nursing-unit-changes/pending"],
  });

  const { data: pendingCount } = useQuery<{ count: number }>({
    queryKey: ["/api/nursing-unit-changes/count"],
    refetchInterval: 30000,
  });

  const { createMutation, updateMutation, deleteMutation } = useCrudMutations<NursingUnit>({
    endpoint: "/api/nursing-units",
    queryKey: ["/api/nursing-units"],
    entityName: "Enfermaria",
  });

  const syncMutation = useMutation({
    mutationFn: async (autoApprove: boolean): Promise<SyncResult> => {
      const response = await apiRequest("POST", "/api/nursing-units/sync", { autoApprove });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nursing-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nursing-unit-changes/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nursing-unit-changes/count"] });
      
      toast({
        title: "Sincronização concluída",
        description: `${data.created} criadas, ${data.updated} atualizadas, ${data.pendingApproval} pendências`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const approveChangeMutation = useMutation({
    mutationFn: async (changeId: string) => {
      const response = await apiRequest("POST", `/api/nursing-unit-changes/${changeId}/approve`, {
        reviewerId: "admin",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nursing-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nursing-unit-changes/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nursing-unit-changes/count"] });
      toast({ title: "Alteração aprovada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao aprovar alteração",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const rejectChangeMutation = useMutation({
    mutationFn: async (changeId: string) => {
      const response = await apiRequest("POST", `/api/nursing-unit-changes/${changeId}/reject`, {
        reviewerId: "admin",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nursing-unit-changes/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nursing-unit-changes/count"] });
      toast({ title: "Alteração rejeitada!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao rejeitar alteração",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: async (): Promise<{ approved: number; errors: number }> => {
      const response = await apiRequest("POST", "/api/nursing-unit-changes/approve-all", {
        reviewerId: "admin",
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nursing-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nursing-unit-changes/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nursing-unit-changes/count"] });
      toast({
        title: "Aprovação em lote concluída",
        description: `${data.approved} aprovadas, ${data.errors} erros`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na aprovação em lote",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      codigo: "",
      nome: "",
      localizacao: "",
      descricao: "",
      observacoes: "",
      ramal: "",
      ativo: true,
    });
  };

  const handleEdit = (unit: NursingUnit) => {
    setEditingUnit(unit);
    setFormData({
      codigo: unit.codigo,
      nome: unit.nome,
      localizacao: unit.localizacao || "",
      descricao: unit.descricao || "",
      observacoes: unit.observacoes || "",
      ramal: unit.ramal || "",
      ativo: unit.ativo,
    });
    setIsEditSheetOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createMutation.mutate(formData, {
      onSuccess: () => {
        setIsCreateSheetOpen(false);
        resetForm();
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, data: formData }, {
        onSuccess: () => {
          setIsEditSheetOpen(false);
          setEditingUnit(null);
          resetForm();
        }
      });
    }
  };

  const filteredUnits = units?.filter(
    (unit) =>
      unit.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (unit.localizacao && unit.localizacao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getChangeTypeLabel = (change: NursingUnitChange) => {
    if (change.changeType === "create") {
      return "Nova Enfermaria";
    }
    return `Atualização: ${change.fieldChanged}`;
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-[#0056b3] text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin")}
              className="text-white hover:bg-white/20"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              <h1 className="text-xl font-bold">Gerenciar Enfermarias</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate(false)}
              disabled={syncMutation.isPending}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              data-testid="button-sync"
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateSheetOpen(true);
                resetForm();
              }}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              data-testid="button-create-unit"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Enfermaria
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === "units" ? "default" : "ghost"}
            onClick={() => setActiveTab("units")}
            data-testid="tab-units"
          >
            Enfermarias
          </Button>
          <Button
            variant={activeTab === "pending" ? "default" : "ghost"}
            onClick={() => setActiveTab("pending")}
            className="relative"
            data-testid="tab-pending"
          >
            Pendências
            {(pendingCount?.count || 0) > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 min-w-[20px] flex items-center justify-center p-1 text-xs"
              >
                {pendingCount?.count}
              </Badge>
            )}
          </Button>
        </div>

        {activeTab === "units" && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar enfermaria..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>

            {unitsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUnits && filteredUnits.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredUnits.map((unit) => (
                  <Card key={unit.id} className="hover-elevate" data-testid={`card-unit-${unit.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{unit.nome}</CardTitle>
                        <p className="text-sm text-muted-foreground">Código: {unit.codigo}</p>
                      </div>
                      <Badge variant={unit.ativo ? "default" : "secondary"}>
                        {unit.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {unit.localizacao && (
                        <p className="text-sm text-muted-foreground">
                          Localização: {unit.localizacao}
                        </p>
                      )}
                      {unit.ramal && (
                        <p className="text-sm text-muted-foreground">Ramal: {unit.ramal}</p>
                      )}
                      {unit.externalId && (
                        <p className="text-xs text-muted-foreground">
                          ID Externo: {unit.externalId}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(unit)}
                          data-testid={`button-edit-${unit.id}`}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(unit.id)}
                          disabled={deleteMutation.isPending}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-${unit.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium">Nenhuma enfermaria cadastrada</h3>
                    <p className="text-sm text-muted-foreground">
                      Clique em "Nova Enfermaria" ou "Sincronizar" para começar.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === "pending" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pendingChanges?.length || 0} pendências aguardando aprovação
              </p>
              {(pendingChanges?.length || 0) > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => approveAllMutation.mutate()}
                  disabled={approveAllMutation.isPending}
                  data-testid="button-approve-all"
                >
                  {approveAllMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Aprovar Todas
                </Button>
              )}
            </div>

            {changesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendingChanges && pendingChanges.length > 0 ? (
              <div className="space-y-3">
                {pendingChanges.map((change) => (
                  <Card
                    key={change.id}
                    className="hover-elevate"
                    data-testid={`card-change-${change.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          {change.changeType === "create" ? (
                            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                              <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
                              <Edit2 className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{getChangeTypeLabel(change)}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                              <Clock className="h-3 w-3" />
                              {formatDate(change.createdAt)}
                              <span>ID Externo: {change.externalId}</span>
                            </div>
                            {change.changeType === "update" && (
                              <div className="text-sm mt-1">
                                <span className="text-red-500 line-through mr-2">{change.oldValue || "-"}</span>
                                <span className="text-green-600">{change.newValue || "-"}</span>
                              </div>
                            )}
                            {change.changeType === "create" && change.newData && (
                              <p className="text-sm text-muted-foreground">
                                Nome: {(change.newData as { nome?: string }).nome || "N/A"}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => approveChangeMutation.mutate(change.id)}
                            disabled={approveChangeMutation.isPending}
                            data-testid={`button-approve-${change.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectChangeMutation.mutate(change.id)}
                            disabled={rejectChangeMutation.isPending}
                            className="text-destructive"
                            data-testid={`button-reject-${change.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
                  <div>
                    <h3 className="text-lg font-medium">Nenhuma pendência</h3>
                    <p className="text-sm text-muted-foreground">
                      Todas as alterações foram processadas.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nova Enfermaria</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, codigo: e.target.value })}
                required
                data-testid="input-codigo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nome: e.target.value })}
                required
                data-testid="input-nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                value={formData.localizacao}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, localizacao: e.target.value })}
                data-testid="input-localizacao"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ramal">Ramal</Label>
              <Input
                id="ramal"
                value={formData.ramal}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ramal: e.target.value })}
                data-testid="input-ramal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, descricao: e.target.value })}
                data-testid="input-descricao"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                value={formData.observacoes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, observacoes: e.target.value })}
                data-testid="input-observacoes"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ativo: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="checkbox-ativo"
              />
              <Label htmlFor="ativo">Enfermaria ativa</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateSheetOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
                data-testid="button-submit-create"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Enfermaria</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="edit-codigo">Código *</Label>
              <Input
                id="edit-codigo"
                value={formData.codigo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, codigo: e.target.value })}
                required
                data-testid="input-edit-codigo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nome: e.target.value })}
                required
                data-testid="input-edit-nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-localizacao">Localização</Label>
              <Input
                id="edit-localizacao"
                value={formData.localizacao}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, localizacao: e.target.value })}
                data-testid="input-edit-localizacao"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ramal">Ramal</Label>
              <Input
                id="edit-ramal"
                value={formData.ramal}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ramal: e.target.value })}
                data-testid="input-edit-ramal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Input
                id="edit-descricao"
                value={formData.descricao}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, descricao: e.target.value })}
                data-testid="input-edit-descricao"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-observacoes">Observações</Label>
              <Input
                id="edit-observacoes"
                value={formData.observacoes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, observacoes: e.target.value })}
                data-testid="input-edit-observacoes"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-ativo"
                checked={formData.ativo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ativo: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="checkbox-edit-ativo"
              />
              <Label htmlFor="edit-ativo">Enfermaria ativa</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditSheetOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1"
                data-testid="button-submit-edit"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
