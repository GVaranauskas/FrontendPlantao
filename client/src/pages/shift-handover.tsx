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
  Edit, Loader2
} from "lucide-react";

export default function ShiftHandoverPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);

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

        <div className="mb-4">
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
        </div>

        {isLoading ? (
          <Card className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap">LEITO</th>
                    <th className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[200px]">NOME</th>
                    <th className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap">DATA INT.</th>
                    <th className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap">BRADEN</th>
                    <th className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[150px]">DIAGNÓSTICO</th>
                    <th className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap">ALERGIAS</th>
                    <th className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap">DELTA</th>
                    <th className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap min-w-[120px]">ELIMINAÇÕES</th>
                    <th className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap">DISPOSITIVOS</th>
                    <th className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap">ATB</th>
                    <th className="px-3 py-3 text-left font-semibold text-xs whitespace-nowrap">OBSERVAÇÕES</th>
                    <th className="px-3 py-3 text-center font-semibold text-xs whitespace-nowrap">AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient, idx) => (
                    <tr 
                      key={patient.id}
                      className={`border-b transition-colors ${
                        patient.alerta === "critical"
                          ? "bg-destructive/5 border-l-4 border-l-destructive hover:bg-destructive/10"
                          : patient.alerta === "medium"
                          ? "bg-chart-4/5 border-l-4 border-l-chart-4 hover:bg-chart-4/10"
                          : idx % 2 === 0
                          ? "bg-muted/30 hover:bg-primary/5"
                          : "hover:bg-primary/5"
                      }`}
                      data-testid={`row-patient-${patient.id}`}
                    >
                      <td className="px-3 py-3 font-bold text-primary text-center">{patient.leito}</td>
                      <td className="px-3 py-3">{patient.nome}</td>
                      <td className="px-3 py-3">{patient.internacao}</td>
                      <td className="px-3 py-3">{patient.braden}</td>
                      <td className="px-3 py-3">{patient.diagnostico}</td>
                      <td className="px-3 py-3">{patient.alergias}</td>
                      <td className="px-3 py-3">{patient.delta}</td>
                      <td className="px-3 py-3">{patient.eliminacoes}</td>
                      <td className="px-3 py-3">{patient.dispositivos}</td>
                      <td className="px-3 py-3">{patient.atb}</td>
                      <td className="px-3 py-3">{patient.observacoes}</td>
                      <td className="px-3 py-3 text-center">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8"
                          data-testid={`button-edit-${patient.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </td>
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
