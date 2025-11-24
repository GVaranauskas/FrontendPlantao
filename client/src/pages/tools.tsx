import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  Bug,
  FileText,
  Home,
  ArrowRight,
} from "lucide-react";

const tools = [
  {
    id: "analytics",
    name: "Analytics Dashboard",
    description: "Análise visual com gráficos, estatísticas e distribuição de dados",
    icon: BarChart3,
    url: "/analytics",
    features: ["Gráficos de Pizza", "Gráficos de Barras", "Análise de Campos", "Tabela Interativa"],
    color: "from-primary/10 to-primary/5",
  },
  {
    id: "debug",
    name: "Debug Visual",
    description: "Visualize JSON bruto de pacientes, alertas e enfermarias",
    icon: Bug,
    url: "/debug",
    features: ["JSON Formatado", "Copiar Dados", "Importar Manualmente", "Expandir/Colapsar"],
    color: "from-chart-2/10 to-chart-2/5",
  },
  {
    id: "text-viewer",
    name: "Visualizador de Textos",
    description: "Explore campos de texto grande da API (evolução, observações, etc)",
    icon: FileText,
    url: "/text-viewer",
    features: ["Visualizar Modal", "Copiar Texto", "Baixar TXT", "Buscar e Filtrar"],
    color: "from-chart-3/10 to-chart-3/5",
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Link href="/modules">
              <Button variant="ghost" size="sm" className="gap-2">
                <Home className="w-4 h-4" />
                Voltar
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2">🛠️ Ferramentas de Análise</h1>
            <p className="text-muted-foreground text-lg">
              Escolha uma ferramenta para explorar e analisar os dados da API
            </p>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.id} href={tool.url}>
                <Card className={`p-6 cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br ${tool.color} border-2 hover:border-primary/50 h-full`}>
                  <div className="space-y-4 h-full flex flex-col">
                    {/* Icon and Title */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{tool.name}</h3>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground flex-1">
                      {tool.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Recursos:</p>
                      <div className="flex flex-wrap gap-1">
                        {tool.features.map((feature) => (
                          <span
                            key={feature}
                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <Button className="w-full gap-2 mt-4">
                      Acessar
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Links */}
        <Card className="p-6 bg-muted/30 border-muted">
          <h3 className="font-semibold mb-3">Links Rápidos (URLs Diretas):</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <code className="bg-black text-green-400 p-3 rounded font-mono text-xs">
              /analytics
            </code>
            <code className="bg-black text-green-400 p-3 rounded font-mono text-xs">
              /debug
            </code>
            <code className="bg-black text-green-400 p-3 rounded font-mono text-xs">
              /text-viewer
            </code>
          </div>
        </Card>
      </div>
    </div>
  );
}
