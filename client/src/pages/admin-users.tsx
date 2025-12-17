import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import * as SelectPrimitive from "@radix-ui/react-select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  Edit2,
  UserX,
  Users,
  Shield,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface User {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

type UserRole = "admin" | "enfermagem";

export default function AdminUsersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    name: "",
    role: "enfermagem" as UserRole,
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateSheetOpen(false);
      resetForm();
      toast({ title: "Usuário criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditSheetOpen(false);
      setEditingUser(null);
      resetForm();
      toast({ title: "Usuário atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário desativado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desativar usuário",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      name: "",
      role: "enfermagem",
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const updateData: Partial<typeof formData> = {
      username: formData.username,
      email: formData.email,
      name: formData.name,
      role: formData.role,
    };
    
    if (formData.password) {
      updateData.password = formData.password;
    }
    
    updateUserMutation.mutate({ id: editingUser.id, data: updateData });
  };

  const openEditSheet = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email || "",
      password: "",
      name: user.name,
      role: user.role as UserRole,
    });
    setIsEditSheetOpen(true);
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const renderFormFields = (isEdit: boolean) => (
    <>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-name" : "create-name"}>Nome Completo</Label>
        <Input
          id={isEdit ? "edit-name" : "create-name"}
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          autoComplete="off"
          data-testid={isEdit ? "input-edit-name" : "input-name"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-username" : "create-username"}>Usuário</Label>
        <Input
          id={isEdit ? "edit-username" : "create-username"}
          value={formData.username}
          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
          required
          autoComplete="off"
          data-testid={isEdit ? "input-edit-username" : "input-username"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-email" : "create-email"}>E-mail</Label>
        <Input
          id={isEdit ? "edit-email" : "create-email"}
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          autoComplete="off"
          data-testid={isEdit ? "input-edit-email" : "input-email"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-password" : "create-password"}>
          {isEdit ? "Nova Senha (deixe em branco para manter)" : "Senha"}
        </Label>
        <Input
          id={isEdit ? "edit-password" : "create-password"}
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          required={!isEdit}
          minLength={6}
          autoComplete="new-password"
          data-testid={isEdit ? "input-edit-password" : "input-password"}
        />
      </div>
      <div className="space-y-2">
        <Label>Perfil</Label>
        <SelectPrimitive.Root
          value={formData.role}
          onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
        >
          <SelectPrimitive.Trigger
            className="flex items-center justify-between w-full px-3 py-2 h-9 text-sm border rounded-md bg-background"
            data-testid={isEdit ? "select-edit-role" : "select-role"}
          >
            <SelectPrimitive.Value placeholder="Selecione o perfil" />
            <ChevronDown className="w-4 h-4 opacity-50" />
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Content className="border rounded-md bg-card shadow-md z-50">
            <SelectPrimitive.Viewport className="p-2">
              <SelectPrimitive.Item
                value="admin"
                className="px-3 py-2 hover:bg-accent rounded cursor-pointer text-sm"
                data-testid={isEdit ? "select-item-edit-admin" : "select-item-admin"}
              >
                <SelectPrimitive.ItemText>Administrador</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
              <SelectPrimitive.Item
                value="enfermagem"
                className="px-3 py-2 hover:bg-accent rounded cursor-pointer text-sm"
                data-testid={isEdit ? "select-item-edit-enfermagem" : "select-item-enfermagem"}
              >
                <SelectPrimitive.ItemText>Enfermagem</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Root>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b-4 border-primary shadow-md">
        <div className="container mx-auto px-5 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/modules")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-primary">
                    Gerenciamento de Usuários
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Administração de acessos ao sistema
                  </p>
                </div>
              </div>
            </div>
            <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
              <SheetTrigger asChild>
                <Button data-testid="button-create-user" onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Criar Novo Usuário</SheetTitle>
                </SheetHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4" autoComplete="off">
                  {renderFormFields(false)}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={createUserMutation.isPending}
                      data-testid="button-submit-create"
                    >
                      {createUserMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Criar Usuário
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-5 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 text-center border-t-4 border-t-primary">
            <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold" data-testid="stat-total-users">
              {users?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total de Usuários</div>
          </Card>
          <Card className="p-4 text-center border-t-4 border-t-chart-2">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-chart-2" />
            <div className="text-2xl font-bold" data-testid="stat-active-users">
              {users?.filter((u) => u.isActive).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Usuários Ativos</div>
          </Card>
          <Card className="p-4 text-center border-t-4 border-t-destructive">
            <XCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
            <div className="text-2xl font-bold" data-testid="stat-inactive-users">
              {users?.filter((u) => !u.isActive).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Usuários Inativos</div>
          </Card>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome, usuário ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {isLoading ? (
          <Card className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Nome</th>
                    <th className="px-4 py-3 text-left font-semibold">Usuário</th>
                    <th className="px-4 py-3 text-left font-semibold">E-mail</th>
                    <th className="px-4 py-3 text-center font-semibold">Perfil</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Último Acesso</th>
                    <th className="px-4 py-3 text-center font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers?.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t hover:bg-muted/30 transition-colors"
                      data-testid={`row-user-${user.id}`}
                    >
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.username}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role === "admin" ? "Admin" : "Enfermagem"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={user.isActive ? "outline" : "destructive"}>
                          {user.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {formatDate(user.lastLogin)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditSheet(user)}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {user.isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`Desativar usuário "${user.name}"?`)) {
                                  deactivateUserMutation.mutate(user.id);
                                }
                              }}
                              data-testid={`button-deactivate-${user.id}`}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers?.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum usuário encontrado
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
        if (!open) setEditingUser(null);
      }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Usuário</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4" autoComplete="off">
            {renderFormFields(true)}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                data-testid="button-submit-edit"
              >
                {updateUserMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
