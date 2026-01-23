import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Users,
  Layout,
  FileText,
  Database,
  BarChart3,
  History,
  Settings,
  Shield,
  Code,
  FileJson,
  Building2,
  AlertCircle,
  Trash2,
  RefreshCcw,
  Loader2,
  Activity,
} from "lucide-react";

interface AdminModule {
  id: string;
  title: string;
  description: string;
  icon: typeof Users;
  route: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

const adminModules: AdminModule[] = [
  {
    id: "users",
    title: "Gerenciamento de Usuários",
    description: "Criar, editar e gerenciar usuários do sistema. Controle de acessos e permissões.",
    icon: Users,
    route: "/admin/users",
    badge: "Admin",
    badgeVariant: "default",
  },
  {
    id: "templates",
    title: "Templates de Enfermarias",
    description: "Configurar campos personalizados e regras especiais para cada unidade de enfermagem.",
    icon: Layout,
    route: "/admin/templates",
  },
  {
    id: "nursing-units",
    title: "Gerenciar Enfermarias",
    description: "Cadastrar, sincronizar e gerenciar unidades de enfermagem. Aprovação de alterações pendentes.",
    icon: Building2,
    route: "/admin/nursing-units",
    badge: "Novo",
    badgeVariant: "default",
  },
  {
    id: "import-logs",
    title: "Logs de Importação",
    description: "Visualizar histórico detalhado de todas as importações de dados realizadas no sistema.",
    icon: FileText,
    route: "/import-logs",
  },
  {
    id: "import-panel",
    title: "Painel de Importação",
    description: "Importar evoluções de pacientes manualmente e monitorar status da sincronização.",
    icon: Database,
    route: "/import-panel",
  },
  {
    id: "analytics",
    title: "Analytics de Pacientes",
    description: "Analise visual de dados, estatisticas de pacientes e taxa de completude dos registros.",
    icon: BarChart3,
    route: "/analytics",
  },
  {
    id: "usage-analytics",
    title: "Analytics de Uso",
    description: "Metricas de uso do sistema, sessoes de usuarios, paginas visitadas e acoes realizadas.",
    icon: Activity,
    route: "/admin/usage-analytics",
    badge: "Novo",
    badgeVariant: "default",
  },
  {
    id: "dashboard",
    title: "Dashboard de Importações",
    description: "Estatísticas consolidadas, histórico de importações e métricas por enfermaria.",
    icon: History,
    route: "/dashboard",
  },
  {
    id: "debug",
    title: "Visualizador JSON",
    description: "Visualize o JSON completo de cada paciente importado. Ideal para debug e verificação de dados.",
    icon: FileJson,
    route: "/debug",
    badge: "Dev",
    badgeVariant: "secondary",
  },
  {
    id: "text-viewer",
    title: "Textos e Evoluções",
    description: "Visualize textos longos extraídos das evoluções, diagnósticos e observações dos pacientes.",
    icon: Code,
    route: "/text-viewer",
  },
];

interface DedupeResult {
  success: boolean;
  duplicatesRemoved: number;
  totalPatientsAfter: number;
  message: string;
}

interface CleanupOrphansResult {
  success: boolean;
  orphansRemoved: number;
  removedPatients: { id: string; leito: string; nome: string }[];
  n8nLeitosCount: number;
  totalPatientsAfter: number;
  message: string;
}

export default function AdminMenuPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDeduping, setIsDeduping] = useState(false);
  const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);

  const { data: pendingCount } = useQuery<{ count: number }>({
    queryKey: ["/api/nursing-unit-changes/count"],
    refetchInterval: 30000,
  });

  const dedupeMutation = useMutation({
    mutationFn: async (): Promise<DedupeResult> => {
      setIsDeduping(true);
      const response = await apiRequest("POST", "/api/admin/dedupe-patients");
      return response.json();
    },
    onSuccess: async (data) => {
      setIsDeduping(false);
      await queryClient.refetchQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Limpeza Concluída",
        description: data.duplicatesRemoved > 0 
          ? `${data.duplicatesRemoved} registros duplicados removidos. Total atual: ${data.totalPatientsAfter} pacientes.`
          : "Nenhuma duplicata encontrada. Banco de dados já está limpo.",
      });
    },
    onError: (error: Error) => {
      setIsDeduping(false);
      toast({
        title: "Erro na Limpeza",
        description: error.message || "Falha ao remover duplicatas",
        variant: "destructive",
      });
    },
  });

  const cleanupOrphansMutation = useMutation({
    mutationFn: async (): Promise<CleanupOrphansResult> => {
      setIsCleaningOrphans(true);
      const response = await apiRequest("POST", "/api/admin/cleanup-orphans");
      return response.json();
    },
    onSuccess: async (data) => {
      setIsCleaningOrphans(false);
      await queryClient.refetchQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Limpeza de Órfãos Concluída",
        description: data.orphansRemoved > 0 
          ? `${data.orphansRemoved} pacientes órfãos removidos (alta hospitalar). Total atual: ${data.totalPatientsAfter} pacientes.`
          : `Nenhum órfão encontrado. ${data.n8nLeitosCount} leitos válidos no N8N.`,
      });
    },
    onError: (error: Error) => {
      setIsCleaningOrphans(false);
      toast({
        title: "Erro na Limpeza",
        description: error.message || "Falha ao remover órfãos",
        variant: "destructive",
      });
    },
  });

  const modulesWithPendingCount = adminModules.map((module) => {
    if (module.id === "nursing-units" && (pendingCount?.count || 0) > 0) {
      return {
        ...module,
        badge: `${pendingCount?.count} pendências`,
        badgeVariant: "destructive" as const,
      };
    }
    return module;
  });

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
                    Painel de Administração
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Gerenciamento do sistema 11Care
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/modules")}
              data-testid="button-back-modules"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Módulos
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-5 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {modulesWithPendingCount.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.id}
                className="p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary"
                onClick={() => setLocation(module.route)}
                data-testid={`card-admin-${module.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h2 className="text-lg font-semibold text-foreground">
                        {module.title}
                      </h2>
                      {module.badge && (
                        <Badge variant={module.badgeVariant || "secondary"}>
                          {module.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full mt-4 justify-center"
                  data-testid={`button-access-${module.id}`}
                >
                  Acessar
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-foreground">Manutenção do Banco de Dados</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-background rounded-lg border">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">Limpar Duplicatas</h4>
                <p className="text-sm text-muted-foreground">
                  Remove pacientes duplicados mantendo o registro mais recente por leito.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => dedupeMutation.mutate()}
                disabled={isDeduping}
                data-testid="button-dedupe-patients"
              >
                {isDeduping ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Limpando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar Duplicatas
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-background rounded-lg border">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">Limpar Órfãos (Alta Hospitalar)</h4>
                <p className="text-sm text-muted-foreground">
                  Remove pacientes que não existem mais no N8N (alta hospitalar ou transferência).
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => cleanupOrphansMutation.mutate()}
                disabled={isCleaningOrphans}
                data-testid="button-cleanup-orphans"
              >
                {isCleaningOrphans ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando N8N...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Limpar Órfãos
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 p-6 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Informações do Sistema</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Versão:</span>
              <span className="ml-2 font-medium">1.0.0</span>
            </div>
            <div>
              <span className="text-muted-foreground">Ambiente:</span>
              <span className="ml-2 font-medium">Desenvolvimento</span>
            </div>
            <div>
              <span className="text-muted-foreground">API N8N:</span>
              <Badge variant="outline" className="ml-2">Conectada</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
