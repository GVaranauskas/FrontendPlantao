import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { NursingUnitTemplate, InsertNursingUnitTemplate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Plus, Edit2, Trash2, ChevronLeft, Check, ChevronDown, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useCrudMutations } from "@/hooks/use-crud-mutations";
import { useToast } from "@/hooks/use-toast";
import type { Enfermaria } from "@/types";

const PATIENT_FIELDS = [
  { id: "leito", label: "Leito" },
  { id: "nome", label: "Nome" },
  { id: "registro", label: "Registro" },
  { id: "especialidadeRamal", label: "Especialidade/Ramal" },
  { id: "dataNascimento", label: "Data de Nascimento" },
  { id: "dataInternacao", label: "Data de Internação" },
  { id: "braden", label: "Escala de Braden" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "mobilidade", label: "Mobilidade" },
  { id: "alergias", label: "Alergias" },
  { id: "dieta", label: "Dieta" },
  { id: "eliminacoes", label: "Eliminações" },
  { id: "dispositivos", label: "Dispositivos" },
  { id: "atb", label: "ATB" },
  { id: "curativos", label: "Curativos" },
  { id: "aporteSaturacao", label: "Aporte/Saturação" },
  { id: "exames", label: "Exames" },
  { id: "cirurgia", label: "Cirurgia" },
  { id: "observacoes", label: "Observações" },
  { id: "previsaoAlta", label: "Previsão de Alta" },
  { id: "alerta", label: "Alerta" },
];

export default function AdminTemplatesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NursingUnitTemplate | null>(null);
  const [showFieldsPanel, setShowFieldsPanel] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertNursingUnitTemplate>>({
    name: "",
    description: "",
    enfermariaCodigo: "",
    fieldsConfiguration: [],
    specialRules: {},
    isActive: 1,
  });

  const { data: templates = [], isLoading, refetch } = useQuery<NursingUnitTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const { data: enfermarias = [] } = useQuery<Enfermaria[]>({
    queryKey: ["/api/enfermarias"],
  });

  const { createMutation, updateMutation, deleteMutation } = useCrudMutations<NursingUnitTemplate>({
    endpoint: "/api/templates",
    queryKey: ["/api/templates"],
    entityName: "Template",
  });

  const resetFormData = () => {
    setFormData({
      name: "",
      description: "",
      enfermariaCodigo: "",
      fieldsConfiguration: [],
      specialRules: {},
      isActive: 1,
    });
  };

  const handleFieldToggle = (fieldId: string) => {
    const currentFields = (formData.fieldsConfiguration as string[]) || [];
    const updated = currentFields.includes(fieldId)
      ? currentFields.filter(f => f !== fieldId)
      : [...currentFields, fieldId];
    setFormData({ ...formData, fieldsConfiguration: updated });
  };

  const handleSelectAllFields = () => {
    const allFieldIds = PATIENT_FIELDS.map(f => f.id);
    setFormData({ ...formData, fieldsConfiguration: allFieldIds });
  };

  const handleClearAllFields = () => {
    setFormData({ ...formData, fieldsConfiguration: [] });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast({ title: "Nome do template é obrigatório", variant: "destructive" });
      return;
    }
    if (!formData.enfermariaCodigo?.trim()) {
      toast({ title: "Enfermaria é obrigatória", variant: "destructive" });
      return;
    }

    const submitData = {
      name: formData.name,
      description: formData.description || "",
      enfermariaCodigo: formData.enfermariaCodigo,
      fieldsConfiguration: formData.fieldsConfiguration || [],
      specialRules: formData.specialRules || {},
      isActive: formData.isActive ?? 1,
    } as InsertNursingUnitTemplate;

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: submitData }, {
        onSuccess: () => {
          setEditingTemplate(null);
          resetFormData();
          setIsFormOpen(false);
        }
      });
    } else {
      createMutation.mutate(submitData, {
        onSuccess: () => {
          resetFormData();
          setIsFormOpen(false);
        }
      });
    }
  };

  const handleEdit = (template: NursingUnitTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      enfermariaCodigo: template.enfermariaCodigo,
      fieldsConfiguration: template.fieldsConfiguration as any,
      specialRules: template.specialRules as any,
      isActive: template.isActive,
    });
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      enfermariaCodigo: "",
      fieldsConfiguration: [],
      specialRules: {},
      isActive: 1,
    });
    setIsFormOpen(true);
  };

  const currentFields = (formData.fieldsConfiguration as string[]) || [];
  const fieldsCount = currentFields.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b-2 border-primary sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/modules")}
                data-testid="button-back"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-primary">Templates de Enfermarias</h1>
                <p className="text-sm text-muted-foreground">Gerenciar templates customizáveis</p>
              </div>
            </div>
            <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
              <SheetTrigger asChild>
                <Button onClick={handleNew} data-testid="button-new-template">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Template
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    {editingTemplate ? "Editar Template" : "Novo Template"}
                  </SheetTitle>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="space-y-5 mt-6">
                  <div>
                    <label className="text-sm font-medium">Nome</label>
                    <Input
                      placeholder="Ex: 10A"
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      data-testid="input-template-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Descrição</label>
                    <Input
                      placeholder="Descrição do template..."
                      value={formData.description || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      data-testid="input-template-description"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Enfermaria *</label>
                    <SelectPrimitive.Root 
                      value={formData.enfermariaCodigo || ""} 
                      onValueChange={(value) => setFormData({ ...formData, enfermariaCodigo: value })}
                    >
                      <SelectPrimitive.Trigger 
                        className="flex items-center justify-between w-full px-3 py-2 border rounded-md bg-background"
                        data-testid="select-template-enfermaria"
                      >
                        <SelectPrimitive.Value placeholder="Selecione a enfermaria..." />
                        <ChevronDown className="w-4 h-4 opacity-50" />
                      </SelectPrimitive.Trigger>
                      <SelectPrimitive.Content className="border rounded-md bg-card shadow-md">
                        <SelectPrimitive.Viewport className="p-2">
                          {enfermarias.map((e) => (
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

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Campos do Paciente</label>
                      <Badge variant="outline" data-testid="badge-fields-count">
                        {fieldsCount}/{PATIENT_FIELDS.length}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2 mb-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleSelectAllFields}
                        data-testid="button-select-all-fields"
                      >
                        Selecionar Todos
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleClearAllFields}
                        data-testid="button-clear-all-fields"
                      >
                        Limpar Todos
                      </Button>
                    </div>

                    <div className="bg-muted/50 border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
                      {PATIENT_FIELDS.map((field) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <CheckboxPrimitive.Root
                            checked={currentFields.includes(field.id)}
                            onCheckedChange={() => handleFieldToggle(field.id)}
                            className="w-4 h-4 rounded border border-border bg-background flex items-center justify-center cursor-pointer hover:bg-muted"
                            data-testid={`checkbox-field-${field.id}`}
                          >
                            <CheckboxPrimitive.Indicator>
                              <Check className="w-3 h-3 text-primary" />
                            </CheckboxPrimitive.Indicator>
                          </CheckboxPrimitive.Root>
                          <label className="text-sm cursor-pointer flex-1" data-testid={`label-field-${field.id}`}>
                            {field.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={
                        createMutation.isPending || updateMutation.isPending
                      }
                      data-testid="button-save-template"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Salvando..."
                        : "Salvar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsFormOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum template criado ainda</p>
            <Button onClick={handleNew} data-testid="button-create-first">
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro template
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const templateFieldsCount = (template.fieldsConfiguration as string[])?.length || 0;
              return (
                <Card
                  key={template.id}
                  className="p-6 hover-elevate cursor-pointer transition-all"
                  data-testid={`card-template-${template.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-primary">
                          {template.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.description || "Sem descrição"}
                        </p>
                      </div>
                      <Badge
                        variant={template.isActive ? "default" : "secondary"}
                        data-testid={`badge-status-${template.id}`}
                      >
                        {template.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">{templateFieldsCount}</span> campos configurados
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Enfermaria:</span> {enfermarias.find(e => e.codigo === template.enfermariaCodigo)?.nome || "N/A"}
                      </p>
                    </div>

                    {templateFieldsCount > 0 && (
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="flex flex-wrap gap-1">
                          {PATIENT_FIELDS.filter(f => 
                            (template.fieldsConfiguration as string[])?.includes(f.id)
                          ).slice(0, 4).map(f => (
                            <Badge key={f.id} variant="outline" className="text-xs">
                              {f.label}
                            </Badge>
                          ))}
                          {templateFieldsCount > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{templateFieldsCount - 4}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template)}
                        data-testid={`button-edit-${template.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(template.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${template.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground pt-2">
                      Criado em:{" "}
                      {new Date(template.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
