import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Patient, Alert } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu, Home, RefreshCcw, Filter, Search, Bell, Printer,
  Edit, Loader2, Cloud, Download
} from "lucide-react";
import { useSyncPatient } from "@/hooks/use-sync-patient";
import { ImportEvolucoes } from "@/components/ImportEvolucoes";

export default function ShiftHandoverPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const { syncSinglePatient, syncMultiplePatients } = useSyncPatient();

  const { data: patients, isLoading, refetch } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const filteredPatients = patients?.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.leito.includes(searchTerm)
  ) || [];

  const stats = {
    complete: patients?.filter(p => p.status === "complete").length || 0,
    pending: patients?.filter(p => p.status === "pending").length || 0,
    alert: patients?.filter(p => p.alerta === "medium").length || 0,
    critical: patients?.filter(p => p.alerta === "critical").length || 0,
    total: patients?.length || 0
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b-4 border-primary shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-5 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-5">
              <Button 
                variant="ghost" 
                size="icon"
                data-testid="button-menu-toggle"
              >
                <Menu className="w-6 h-6 text-primary" />
              </Button>
              <img 
                src="https://11care.com.br/wp-content/uploads/2024/05/logo-11Care-azul-1024x249.png.webp"
                alt="11Care"
                className="h-11 hidden sm:block"
              />
              <div>
                <h1 className="text-xl sm:text-[22px] font-bold text-primary leading-tight">
                  Passagem de Plantão (SBAR)
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  UNIDADE: 10 A - DAR | ENFERMEIRO: ANDRESSA / LIDIA / GUSTAVO
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => refetch()}
                data-testid="button-sync"
              >
                <RefreshCcw className="w-5 h-5" />
              </Button>
              <Sheet open={syncOpen} onOpenChange={setSyncOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    data-testid="button-sync-external"
                  >
                    <Cloud className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Cloud className="w-5 h-5" />
                      Sincronizar com API Externa
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Sincronize dados de pacientes diretamente da API externa do sistema de evolução.
                    </p>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sincronizar Paciente Específico:</label>
                      <Input
                        placeholder="Ex: 10A02"
                        id="leito-input"
                        className="text-sm"
                        data-testid="input-sync-leito"
                      />
                      <Button 
                        className="w-full"
                        size="sm"
                        onClick={() => {
                          const leito = (document.getElementById("leito-input") as HTMLInputElement)?.value;
                          if (leito.trim()) {
                            syncSinglePatient.mutate(leito.trim());
                            (document.getElementById("leito-input") as HTMLInputElement).value = "";
                          }
                        }}
                        disabled={syncSinglePatient.isPending}
                        data-testid="button-sync-single"
                      >
                        {syncSinglePatient.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sincronizando...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Sincronizar
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-3">
                        Ou sincronize múltiplos pacientes de uma vez:
                      </p>
                      <Button 
                        variant="outline"
                        className="w-full"
                        size="sm"
                        onClick={() => {
                          const leitos = patients?.map(p => p.leito) || [];
                          if (leitos.length > 0) {
                            syncMultiplePatients.mutate(leitos);
                          }
                        }}
                        disabled={syncMultiplePatients.isPending || !patients?.length}
                        data-testid="button-sync-all"
                      >
                        {syncMultiplePatients.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sincronizando...
                          </>
                        ) : (
                          <>
                            <Cloud className="w-4 h-4 mr-2" />
                            Sincronizar Todos ({patients?.length || 0})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="ghost" size="icon" data-testid="button-filter">
                <Filter className="w-5 h-5" />
              </Button>
              <Sheet open={alertsOpen} onOpenChange={setAlertsOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative"
                    data-testid="button-alerts"
                  >
                    <Bell className="w-5 h-5" />
                    {alerts && alerts.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        {alerts.length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Alertas do Sistema
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    {alerts?.map((alert) => (
                      <Card 
                        key={alert.id}
                        className={`p-4 border-l-4 ${
                          alert.priority === "high" 
                            ? "border-l-destructive bg-destructive/5" 
                            : alert.priority === "medium"
                            ? "border-l-chart-3 bg-chart-3/5"
                            : "border-l-chart-4 bg-chart-4/5"
                        }`}
                        data-testid={`alert-${alert.id}`}
                      >
                        <Badge 
                          variant={alert.priority === "high" ? "destructive" : "secondary"}
                          className="mb-2"
                        >
                          {alert.priority === "high" ? "ALTA" : alert.priority === "medium" ? "MÉDIA" : "BAIXA"} PRIORIDADE
                        </Badge>
                        <div className="font-semibold text-sm mb-1">
                          Leito {alert.leito} - {alert.title}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.description}
                        </p>
                        <p className="text-xs text-muted-foreground">{alert.time}</p>
                      </Card>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
              <Button className="hidden sm:flex" data-testid="button-print">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-card border-b py-4">
        <div className="container mx-auto px-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button 
              onClick={() => setLocation("/modules")}
              className="hover:text-primary transition-colors"
              data-testid="link-home"
            >
              <Home className="w-4 h-4 inline mr-1" />
              Início
            </button>
            <span>/</span>
            <button 
              onClick={() => setLocation("/modules")}
              className="hover:text-primary transition-colors"
              data-testid="link-modules"
            >
              Módulos
            </button>
            <span>/</span>
            <span>Passagem de Plantão</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-5 py-6 flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 text-center border-t-4 border-t-chart-2 bg-gradient-to-br from-card to-chart-2/5">
            <div className="text-3xl font-bold text-chart-2 mb-1" data-testid="stat-complete">
              {stats.complete}
            </div>
            <div className="text-sm font-semibold text-muted-foreground">Completos</div>
          </Card>
          <Card className="p-4 text-center border-t-4 border-t-chart-3 bg-gradient-to-br from-card to-chart-3/5">
            <div className="text-3xl font-bold text-chart-3 mb-1" data-testid="stat-pending">
              {stats.pending}
            </div>
            <div className="text-sm font-semibold text-muted-foreground">Pendentes</div>
          </Card>
          <Card className="p-4 text-center border-t-4 border-t-chart-4 bg-gradient-to-br from-card to-chart-4/5">
            <div className="text-3xl font-bold text-chart-4 mb-1" data-testid="stat-alert">
              {stats.alert}
            </div>
            <div className="text-sm font-semibold text-muted-foreground">Com Alertas</div>
          </Card>
          <Card className="p-4 text-center border-t-4 border-t-destructive bg-gradient-to-br from-card to-destructive/5">
            <div className="text-3xl font-bold text-destructive mb-1" data-testid="stat-critical">
              {stats.critical}
            </div>
            <div className="text-sm font-semibold text-muted-foreground">Críticos</div>
          </Card>
          <Card className="p-4 text-center border-t-4 border-t-primary bg-gradient-to-br from-card to-primary/5">
            <div className="text-3xl font-bold text-primary mb-1" data-testid="stat-total">
              {stats.total}
            </div>
            <div className="text-sm font-semibold text-muted-foreground">Total</div>
          </Card>
        </div>

        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por paciente ou leito..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Card className="p-3 bg-muted/30">
            <div className="flex items-center gap-6 text-xs flex-wrap">
              <div className="font-semibold text-muted-foreground">Legenda - Mobilidade:</div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">A</Badge>
                <span className="text-muted-foreground">Acamado</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">D</Badge>
                <span className="text-muted-foreground">Deambula</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">DA</Badge>
                <span className="text-muted-foreground">Deambula Com Auxílio</span>
              </div>
            </div>
          </Card>
        </div>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            📥 Importar Dados do Sistema Externo (N8N)
          </h2>
          <ImportEvolucoes />
        </section>

        {isLoading ? (
          <Card className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                  <tr>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap sticky left-0 bg-primary z-10">LEITO</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[100px]">ESPECIALIDADE/<br/>RAMAL</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[180px]">NOME/<br/>REGISTRO/<br/>DATA DE NASCIMENTO</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[90px]">DATA DE<br/>INTERNAÇÃO</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[70px]">RQ BRADEN<br/>SCP</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[140px]">DIAGNÓSTICO/<br/>COMORBIDADES</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[90px]">ALERGIAS</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[80px]">MOBILIDADE</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[120px]">DIETA</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[90px]">ELIMINAÇÕES</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[110px]">DISPOSITIVOS</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[100px]">ATB</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[100px]">CURATIVOS</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[100px]">APORTE<br/>E SATURAÇÃO</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[140px]">EXAMES<br/>REALIZADOS/<br/>PENDENTES</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[120px]">DATA DA<br/>PROGRAMAÇÃO<br/>CIRÚRGICA</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[180px]">OBSERVAÇÕES/<br/>INTERCORRÊNCIAS</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[100px]">PREVISÃO<br/>DE ALTA</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient, idx) => (
                    <tr 
                      key={patient.id}
                      className={`transition-colors ${
                        patient.alerta === "critical"
                          ? "bg-destructive/10 hover:bg-destructive/20"
                          : patient.alerta === "medium"
                          ? "bg-chart-3/10 hover:bg-chart-3/20"
                          : idx % 2 === 0
                          ? "bg-muted/30 hover:bg-muted/50"
                          : "hover:bg-muted/30"
                      }`}
                      data-testid={`row-patient-${patient.id}`}
                    >
                      <td className="px-2 py-2 text-center font-bold text-primary border border-border sticky left-0 bg-inherit z-10">{patient.leito}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.especialidadeRamal || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">
                        <div className="font-semibold">{patient.nome}</div>
                        <div className="text-muted-foreground">{patient.registro || "-"}</div>
                        <div className="text-muted-foreground">{patient.dataNascimento || "-"}</div>
                      </td>
                      <td className="px-2 py-2 text-[10px] text-center border border-border">{patient.dataInternacao || "-"}</td>
                      <td className="px-2 py-2 text-[10px] text-center border border-border">{patient.rqBradenScp || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.diagnosticoComorbidades || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.alergias || "-"}</td>
                      <td className="px-2 py-2 text-[10px] text-center border border-border">{patient.mobilidade || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.dieta || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.eliminacoes || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.dispositivos || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.atb || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.curativos || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.aporteSaturacao || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.examesRealizadosPendentes || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.dataProgramacaoCirurgica || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.observacoesIntercorrencias || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.previsaoAlta || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
