import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    title: "Analytics e Relatórios",
    description: "Análise visual de dados, estatísticas de pacientes e taxa de completude dos registros.",
    icon: BarChart3,
    route: "/analytics",
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

export default function AdminMenuPage() {
  const [, setLocation] = useLocation();

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
          {adminModules.map((module) => {
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
