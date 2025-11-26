import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { NursingUnitTemplate, InsertNursingUnitTemplate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminTemplatesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NursingUnitTemplate | null>(null);
  const [formData, setFormData] = useState<Partial<InsertNursingUnitTemplate>>({
    name: "",
    description: "",
    fieldsConfiguration: [],
    specialRules: {},
    isActive: 1,
  });

  const { data: templates = [], isLoading, refetch } = useQuery<NursingUnitTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertNursingUnitTemplate) =>
      apiRequest("POST", "/api/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setFormData({
        name: "",
        description: "",
        fieldsConfiguration: [],
        specialRules: {},
        isActive: 1,
      });
      setIsFormOpen(false);
      toast({ title: "Template criado com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar template", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; template: Partial<InsertNursingUnitTemplate> }) =>
      apiRequest("PATCH", `/api/templates/${data.id}`, data.template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setEditingTemplate(null);
      setFormData({
        name: "",
        description: "",
        fieldsConfiguration: [],
        specialRules: {},
        isActive: 1,
      });
      setIsFormOpen(false);
      toast({ title: "Template atualizado com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar template", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template deletado com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao deletar template", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast({ title: "Nome do template é obrigatório", variant: "destructive" });
      return;
    }

    const submitData = {
      name: formData.name,
      description: formData.description || "",
      fieldsConfiguration: formData.fieldsConfiguration || [],
      specialRules: formData.specialRules || {},
      isActive: formData.isActive ?? 1,
    } as InsertNursingUnitTemplate;

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, template: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (template: NursingUnitTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
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
      fieldsConfiguration: [],
      specialRules: {},
      isActive: 1,
    });
    setIsFormOpen(true);
  };

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
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>
                    {editingTemplate ? "Editar Template" : "Novo Template"}
                  </SheetTitle>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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
                    <Textarea
                      placeholder="Descrição do template..."
                      value={formData.description || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      data-testid="input-template-description"
                      className="resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
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
            {templates.map((template) => (
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
