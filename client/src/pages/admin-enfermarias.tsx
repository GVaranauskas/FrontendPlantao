import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Search,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Network,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";
import type { Enfermaria, InsertEnfermaria, UpdateEnfermaria } from "@shared/schema";

const createEnfermariaSchema = z.object({
  codigo: z.string().min(1, "Codigo e obrigatorio").max(20, "Maximo 20 caracteres"),
  nome: z.string().min(1, "Nome e obrigatorio").max(100, "Maximo 100 caracteres"),
  flowId: z.string().max(50, "Maximo 50 caracteres").default("1a2b3c"),
  descricao: z.string().max(500, "Maximo 500 caracteres").nullish(),
  ativo: z.boolean().default(true),
});

const updateEnfermariaSchema = createEnfermariaSchema.partial();

type CreateEnfermariaFormData = z.infer<typeof createEnfermariaSchema>;
type UpdateEnfermariaFormData = z.infer<typeof updateEnfermariaSchema>;

export default function AdminEnfermariasPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editingEnfermaria, setEditingEnfermaria] = useState<Enfermaria | null>(null);

  const createForm = useForm<CreateEnfermariaFormData>({
    resolver: zodResolver(createEnfermariaSchema),
    defaultValues: {
      codigo: "",
      nome: "",
      flowId: "1a2b3c",
      descricao: "",
      ativo: true,
    },
  });

  const editForm = useForm<UpdateEnfermariaFormData>({
    resolver: zodResolver(updateEnfermariaSchema),
    defaultValues: {
      codigo: "",
      nome: "",
      flowId: "1a2b3c",
      descricao: "",
      ativo: true,
    },
  });

  const { data: enfermarias, isLoading } = useQuery<Enfermaria[]>({
    queryKey: ["/api/enfermarias"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateEnfermariaFormData) => {
      const payload: InsertEnfermaria = {
        codigo: data.codigo,
        nome: data.nome,
        flowId: data.flowId || "1a2b3c",
        descricao: data.descricao || null,
        ativo: data.ativo,
      };
      return apiRequest("POST", "/api/enfermarias", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enfermarias"] });
      setIsCreateSheetOpen(false);
      createForm.reset();
      toast({ title: "Enfermaria criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar enfermaria",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEnfermariaFormData }) => {
      const payload: UpdateEnfermaria = {
        codigo: data.codigo,
        nome: data.nome,
        flowId: data.flowId || "1a2b3c",
        descricao: data.descricao || null,
        ativo: data.ativo,
      };
      return apiRequest("PATCH", `/api/enfermarias/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enfermarias"] });
      setIsEditSheetOpen(false);
      setEditingEnfermaria(null);
      editForm.reset();
      toast({ title: "Enfermaria atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar enfermaria",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/enfermarias/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enfermarias"] });
      toast({ title: "Enfermaria removida com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover enfermaria",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (codigo: string) => {
      return apiRequest("POST", `/api/sync/evolucoes/${codigo}`);
    },
    onSuccess: (_, codigo) => {
      queryClient.invalidateQueries({ queryKey: ["/api/enfermarias"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: `Sincronizacao da enfermaria ${codigo} iniciada!` });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao sincronizar",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = createForm.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  const handleEditSubmit = editForm.handleSubmit((data) => {
    if (!editingEnfermaria) return;
    updateMutation.mutate({ id: editingEnfermaria.id, data });
  });

  const openEditSheet = (enfermaria: Enfermaria) => {
    setEditingEnfermaria(enfermaria);
    editForm.reset({
      codigo: enfermaria.codigo,
      nome: enfermaria.nome,
      flowId: enfermaria.flowId || "1a2b3c",
      descricao: enfermaria.descricao || "",
      ativo: enfermaria.ativo,
    });
    setIsEditSheetOpen(true);
  };

  const filteredEnfermarias = enfermarias?.filter(
    (e) =>
      e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const EnfermariaFormComponent = ({ 
    form, 
    isEdit = false, 
    onSubmit, 
    isPending 
  }: { 
    form: any;
    isEdit?: boolean; 
    onSubmit: () => void;
    isPending: boolean;
  }) => {
    const { register, formState: { errors }, watch, setValue } = form;
    const ativoValue = watch("ativo") as boolean | undefined;
    
    return (
      <form onSubmit={onSubmit} className="space-y-4 mt-4" data-testid={isEdit ? "form-edit-enfermaria" : "form-create-enfermaria"}>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-codigo" : "codigo"}>Codigo *</Label>
          <Input
            id={isEdit ? "edit-codigo" : "codigo"}
            {...register("codigo")}
            placeholder="Ex: 10A, 10B, UTI01"
            data-testid={isEdit ? "input-edit-codigo" : "input-codigo"}
          />
          <p className="text-xs text-muted-foreground">
            Codigo identificador da enfermaria no sistema N8N
          </p>
          {errors.codigo && (
            <p className="text-xs text-destructive" data-testid={isEdit ? "error-edit-codigo" : "error-codigo"}>
              {errors.codigo.message}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-nome" : "nome"}>Nome *</Label>
          <Input
            id={isEdit ? "edit-nome" : "nome"}
            {...register("nome")}
            placeholder="Ex: Enfermaria 10A - Clinica Medica"
            data-testid={isEdit ? "input-edit-nome" : "input-nome"}
          />
          {errors.nome && (
            <p className="text-xs text-destructive" data-testid={isEdit ? "error-edit-nome" : "error-nome"}>
              {errors.nome.message}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-flowId" : "flowId"}>Flow ID (N8N)</Label>
          <Input
            id={isEdit ? "edit-flowId" : "flowId"}
            {...register("flowId")}
            placeholder="Ex: 1a2b3c (padrao)"
            data-testid={isEdit ? "input-edit-flowId" : "input-flowId"}
          />
          <p className="text-xs text-muted-foreground">
            Identificador do fluxo N8N. Valor padrao: 1a2b3c
          </p>
          {errors.flowId && (
            <p className="text-xs text-destructive" data-testid={isEdit ? "error-edit-flowId" : "error-flowId"}>
              {errors.flowId.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-descricao" : "descricao"}>Descricao</Label>
          <Input
            id={isEdit ? "edit-descricao" : "descricao"}
            {...register("descricao")}
            placeholder="Descricao opcional da enfermaria"
            data-testid={isEdit ? "input-edit-descricao" : "input-descricao"}
          />
          {errors.descricao && (
            <p className="text-xs text-destructive" data-testid={isEdit ? "error-edit-descricao" : "error-descricao"}>
              {errors.descricao.message}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            id={isEdit ? "edit-ativo" : "ativo"}
            checked={ativoValue ?? true}
            onChange={(e) => setValue("ativo", e.target.checked)}
            className="w-4 h-4 rounded border-border accent-primary"
            data-testid={isEdit ? "checkbox-edit-ativo" : "checkbox-ativo"}
          />
          <div>
            <Label htmlFor={isEdit ? "edit-ativo" : "ativo"}>Enfermaria Ativa</Label>
            <p className="text-xs text-muted-foreground">
              Enfermarias inativas nao aparecem na selecao
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="submit"
            disabled={isPending}
            data-testid={isEdit ? "button-submit-edit" : "button-submit-create"}
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Salvar Alteracoes" : "Criar Enfermaria"}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-admin-enfermarias">
      <header className="bg-card border-b-4 border-primary shadow-md" data-testid="header-admin-enfermarias">
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
                  <h1 className="text-xl font-bold text-primary" data-testid="text-page-title">
                    Gerenciamento de Enfermarias
                  </h1>
                  <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">
                    Configuracao de unidades e integracao N8N
                  </p>
                </div>
              </div>
            </div>
            <Sheet open={isCreateSheetOpen} onOpenChange={(open) => {
              setIsCreateSheetOpen(open);
              if (!open) createForm.reset();
            }}>
              <SheetTrigger asChild>
                <Button data-testid="button-create-enfermaria">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Enfermaria
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-testid="sheet-create-enfermaria">
                <SheetHeader>
                  <SheetTitle data-testid="text-sheet-title-create">Criar Nova Enfermaria</SheetTitle>
                </SheetHeader>
                <EnfermariaFormComponent 
                  form={createForm} 
                  onSubmit={handleCreateSubmit} 
                  isPending={createMutation.isPending}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-5 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" data-testid="stats-grid">
          <Card className="p-4 text-center border-t-4 border-t-primary" data-testid="card-stat-total">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold" data-testid="stat-total-enfermarias">
              {enfermarias?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total de Enfermarias</div>
          </Card>
          <Card className="p-4 text-center border-t-4 border-t-chart-2" data-testid="card-stat-active">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-chart-2" />
            <div className="text-2xl font-bold" data-testid="stat-active-enfermarias">
              {enfermarias?.filter((e) => e.ativo).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Enfermarias Ativas</div>
          </Card>
          <Card className="p-4 text-center border-t-4 border-t-chart-3" data-testid="card-stat-flowid">
            <Network className="w-8 h-8 mx-auto mb-2 text-chart-3" />
            <div className="text-2xl font-bold" data-testid="stat-with-flowid">
              {enfermarias?.filter((e) => e.flowId && e.flowId !== "1a2b3c").length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Com Flow ID Customizado</div>
          </Card>
        </div>

        <div className="mb-4" data-testid="search-container">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por codigo ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {isLoading ? (
          <Card className="p-12 flex items-center justify-center" data-testid="loading-container">
            <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loading-spinner" />
          </Card>
        ) : (
          <Card className="overflow-hidden" data-testid="table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-enfermarias">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Codigo</th>
                    <th className="px-4 py-3 text-left font-semibold">Nome</th>
                    <th className="px-4 py-3 text-center font-semibold">Flow ID</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Ultima Sincronizacao</th>
                    <th className="px-4 py-3 text-center font-semibold">Acoes</th>
                  </tr>
                </thead>
                <tbody data-testid="table-body">
                  {filteredEnfermarias?.map((enfermaria) => (
                    <tr
                      key={enfermaria.id}
                      className="border-t hover:bg-muted/30 transition-colors"
                      data-testid={`row-enfermaria-${enfermaria.id}`}
                    >
                      <td className="px-4 py-3 font-medium font-mono" data-testid={`text-codigo-${enfermaria.id}`}>
                        {enfermaria.codigo}
                      </td>
                      <td className="px-4 py-3" data-testid={`text-nome-${enfermaria.id}`}>
                        {enfermaria.nome}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {enfermaria.flowId && enfermaria.flowId !== "1a2b3c" ? (
                          <Badge variant="outline" className="font-mono" data-testid={`badge-flowid-${enfermaria.id}`}>
                            {enfermaria.flowId}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs" data-testid={`text-flowid-default-${enfermaria.id}`}>
                            Padrao
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge 
                          variant={enfermaria.ativo ? "outline" : "destructive"}
                          data-testid={`badge-status-${enfermaria.id}`}
                        >
                          {enfermaria.ativo ? "Ativa" : "Inativa"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground" data-testid={`text-sync-${enfermaria.id}`}>
                        {formatDate(enfermaria.ultimaSync)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1" data-testid={`actions-${enfermaria.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => syncMutation.mutate(enfermaria.codigo)}
                            disabled={syncMutation.isPending || !enfermaria.ativo}
                            title="Sincronizar agora"
                            data-testid={`button-sync-${enfermaria.id}`}
                          >
                            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditSheet(enfermaria)}
                            title="Editar enfermaria"
                            data-testid={`button-edit-${enfermaria.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Remover enfermaria "${enfermaria.nome}"?`)) {
                                deleteMutation.mutate(enfermaria.id);
                              }
                            }}
                            title="Remover enfermaria"
                            data-testid={`button-delete-${enfermaria.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEnfermarias?.length === 0 && (
                    <tr data-testid="row-empty">
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground" data-testid="text-empty-list">
                        Nenhuma enfermaria encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Sheet open={isEditSheetOpen} onOpenChange={(open) => {
        setIsEditSheetOpen(open);
        if (!open) {
          setEditingEnfermaria(null);
          editForm.reset();
        }
      }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-testid="sheet-edit-enfermaria">
          <SheetHeader>
            <SheetTitle data-testid="text-sheet-title-edit">Editar Enfermaria</SheetTitle>
          </SheetHeader>
          <EnfermariaFormComponent 
            form={editForm} 
            isEdit 
            onSubmit={handleEditSubmit}
            isPending={updateMutation.isPending}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
