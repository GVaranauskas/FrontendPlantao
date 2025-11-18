import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Calendar, Bed, LogOut, FileText, Settings } from "lucide-react";

const modules = [
  {
    id: "passagem-plantao",
    title: "Passagem de Plantão",
    description: "Sistema SBAR completo para passagem de plantão com registro detalhado de pacientes.",
    features: [
      "Registro digital SBAR completo",
      "Alertas inteligentes de pendências",
      "Histórico completo de passagens",
      "Relatórios e impressão automática"
    ],
    icon: ClipboardList,
    status: "active",
    route: "/shift-handover"
  },
  {
    id: "escala-trabalho",
    title: "Escala de Trabalho",
    description: "Gestão completa de escalas de trabalho com otimização automática de recursos.",
    features: [
      "Criação automática de escalas",
      "Gestão de folgas e férias",
      "Controle de horas extras",
      "Notificações de escalas"
    ],
    icon: Calendar,
    status: "coming",
    route: null
  },
  {
    id: "gestao-leitos",
    title: "Gestão de Leitos",
    description: "Controle em tempo real da ocupação e disponibilidade de leitos hospitalares.",
    features: [
      "Dashboard de ocupação em tempo real",
      "Gestão de altas e transferências",
      "Previsão de disponibilidade",
      "Relatórios de taxa de ocupação"
    ],
    icon: Bed,
    status: "coming",
    route: null
  }
];

export default function ModulesPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b-4 border-primary shadow-md">
        <div className="container mx-auto px-5 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <img 
                src="https://11care.com.br/wp-content/uploads/2024/05/logo-11Care-azul-1024x249.png.webp"
                alt="11Care"
                className="h-11"
              />
              <div>
                <h1 className="text-2xl font-bold text-primary mb-1" data-testid="text-welcome">
                  Bem-vindo, Enfermeiro(a)
                </h1>
                <p className="text-sm text-muted-foreground">
                  UNIDADE DE INTERNAÇÃO: 10 A - DAR
                </p>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={() => setLocation("/")}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-5 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-7 mb-10">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = module.status === "active";
            
            return (
              <Card 
                key={module.id}
                className={`p-7 relative overflow-hidden transition-all hover:shadow-lg ${
                  isActive ? 'border-primary bg-gradient-to-br from-card to-primary/5' : ''
                }`}
                data-testid={`card-module-${module.id}`}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/70" />
                
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-[22px] font-bold text-primary">
                      {module.title}
                    </h2>
                  </div>
                  <Badge 
                    variant={isActive ? "default" : "secondary"}
                    className={isActive ? "bg-chart-2" : ""}
                    data-testid={`badge-status-${module.id}`}
                  >
                    {isActive ? "Ativo" : "Em Breve"}
                  </Badge>
                </div>

                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {module.description}
                </p>

                <ul className="space-y-3 mb-6">
                  {module.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-chart-2 text-xs font-bold">✓</span>
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isActive ? "default" : "secondary"}
                  disabled={!isActive}
                  onClick={() => module.route && setLocation(module.route)}
                  data-testid={`button-access-${module.id}`}
                >
                  {isActive ? "Acessar Módulo" : "Em Desenvolvimento"}
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button variant="outline" data-testid="button-reports">
            <FileText className="w-4 h-4 mr-2" />
            Relatórios Diários
          </Button>
          <Button variant="outline" data-testid="button-settings">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>
    </div>
  );
}
