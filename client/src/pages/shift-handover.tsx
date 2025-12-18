import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Patient, Alert } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as SelectPrimitive from "@radix-ui/react-select";
import { 
  Menu, Home, RefreshCcw, Filter, Search, Bell, Printer,
  Edit, Loader2, Cloud, Download, FileSpreadsheet, ChevronDown, Brain,
  AlertTriangle, CheckCircle, Activity, Shield, Bug, Wind, Utensils, Heart,
  Clock, FileText, Stethoscope, Users, Pill, Bed, TrendingUp, ChevronRight
} from "lucide-react";
import { useSyncPatient } from "@/hooks/use-sync-patient";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { ImportEvolucoes } from "@/components/ImportEvolucoes";
import { exportPatientsToExcel } from "@/lib/export-to-excel";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AIAnalysisResult {
  resumoGeral: string;
  pacientesCriticos: string[];
  alertasGerais: string[];
  estatisticas: {
    total: number;
    altaComplexidade: number;
    mediaBraden: number;
  };
}

interface ClinicalAlert {
  tipo: string;
  nivel: "VERMELHO" | "AMARELO" | "VERDE";
  titulo: string;
  descricao?: string;
}

interface ClinicalInsights {
  timestamp: string;
  nivel_alerta: "VERMELHO" | "AMARELO" | "VERDE";
  alertas_count: { vermelho: number; amarelo: number; verde: number };
  principais_alertas: ClinicalAlert[];
  gaps_criticos: string[];
  score_qualidade: number;
  categoria_qualidade: string;
  prioridade_acao: string | null;
  recomendacoes_enfermagem: string[];
}

interface LeitoDetalhadoSimples {
  leito: string;
  nome: string;
  recomendacoes: string[];
  alertas: ClinicalAlert[];
}

interface LeitoDetalhado {
  leito: string;
  nome: string;
  diagnostico_principal: string;
  tipo_enfermidade: string;
  dias_internacao: number;
  nivel_alerta: "VERMELHO" | "AMARELO" | "VERDE";
  score_qualidade: number;
  braden: string;
  mobilidade: string;
  riscos_identificados: Array<{
    tipo: string;
    nivel: "ALTO" | "MODERADO" | "BAIXO";
    descricao: string;
  }>;
  protocolos_ativos: Array<{
    nome: string;
    descricao: string;
    frequencia?: string;
  }>;
  recomendacoes_enfermagem: string[];
  alertas: Array<{
    tipo: string;
    nivel: "VERMELHO" | "AMARELO" | "VERDE";
    titulo: string;
    descricao?: string;
  }>;
  gaps_documentacao: string[];
  dispositivos: string[];
  antibioticos: string[];
}

interface LeitoClassificado {
  leito: string;
  nome: string;
  nivel: "VERMELHO" | "AMARELO" | "VERDE";
  problemas: string[];
  recomendacoes: string[];
  alertas_prioritarios: string[];
}

interface ClassificacaoProblemas {
  risco_queda: LeitoClassificado[];
  risco_lesao_pressao: LeitoClassificado[];
  risco_infeccao: LeitoClassificado[];
  risco_broncoaspiracao: LeitoClassificado[];
  risco_nutricional: LeitoClassificado[];
  risco_respiratorio: LeitoClassificado[];
}

interface ProtocoloEnfermagem {
  categoria: string;
  icone: string;
  cor: string;
  leitos_afetados: string[];
  quantidade: number;
  protocolo_resumo: string;
  acoes_principais: string[];
}

interface IndicadoresPlantao {
  total_pacientes: number;
  media_braden: number;
  media_dias_internacao: number;
  taxa_completude_documentacao: number;
  pacientes_alta_complexidade: number;
  pacientes_com_dispositivos: number;
  pacientes_com_atb: number;
  pacientes_acamados: number;
  pacientes_risco_queda_alto: number;
  pacientes_lesao_pressao: number;
}

interface AnaliseGeral {
  timestamp: string;
  resumo_executivo: string;
  alertas_criticos_enfermagem: string[];
  classificacao_por_problema: ClassificacaoProblemas;
  leitos_prioridade_maxima: LeitoClassificado[];
  leitos_detalhados: LeitoDetalhado[];
  protocolos_enfermagem: ProtocoloEnfermagem[];
  indicadores: IndicadoresPlantao;
  estatisticas: {
    total: number;
    vermelho: number;
    amarelo: number;
    verde: number;
    por_tipo_risco: Record<string, number>;
  };
  recomendacoes_gerais_plantao: string[];
}

interface ClinicalBatchResult {
  total: number;
  success: number;
  summary: { vermelho: number; amarelo: number; verde: number; errors: number };
  analiseGeral?: AnaliseGeral;
  leitosAtencao: LeitoDetalhadoSimples[];
  leitosAlerta: LeitoDetalhadoSimples[];
  failedPatients: string[];
}

interface NursingTemplate {
  id: string;
  name: string;
  description?: string;
}

export default function ShiftHandoverPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    const saved = localStorage.getItem('lastSyncTime');
    return saved ? new Date(saved) : null;
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [clinicalBatchResult, setClinicalBatchResult] = useState<ClinicalBatchResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetailsOpen, setPatientDetailsOpen] = useState(false);
  const [individualAnalysis, setIndividualAnalysis] = useState<ClinicalInsights | null>(null);
  const { syncSinglePatient, syncMultiplePatients } = useSyncPatient();
  const { toast } = useToast();

  const analyzePatientsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/analyze-patients");
      return response.json();
    },
    onSuccess: (data: AIAnalysisResult) => {
      setAiAnalysis(data);
      toast({
        title: "Análise concluída",
        description: "A análise de IA foi gerada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na análise",
        description: error.message || "Não foi possível gerar a análise.",
        variant: "destructive",
      });
    },
  });

  const clinicalAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/clinical-analysis-batch");
      return response.json();
    },
    onSuccess: (data: ClinicalBatchResult) => {
      setClinicalBatchResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Análise Clínica Concluída",
        description: `${data.summary.vermelho} críticos, ${data.summary.amarelo} alertas, ${data.summary.verde} ok`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na análise clínica",
        description: error.message || "Não foi possível realizar análise clínica.",
        variant: "destructive",
      });
    },
  });

  const individualAnalysisMutation = useMutation({
    mutationFn: async (patientId: string) => {
      const response = await apiRequest("POST", `/api/ai/clinical-analysis/${patientId}`);
      return response.json();
    },
    onSuccess: (data: { insights: ClinicalInsights; analysis: any }) => {
      setIndividualAnalysis(data.insights);
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Análise Individual Concluída",
        description: `Nível de alerta: ${data.insights.nivel_alerta}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na análise individual",
        description: error.message || "Não foi possível analisar este paciente.",
        variant: "destructive",
      });
    },
  });

  const openPatientDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIndividualAnalysis((patient.clinicalInsights as ClinicalInsights) || null);
    setPatientDetailsOpen(true);
  };
  
  // TEMPORARIAMENTE DESATIVADO: Auto-sync a cada 15 minutos
  // Para reativar, mude enabled para true
  const { isSyncing: isAutoSyncing, triggerSync } = useAutoSync({
    enabled: false, // DESATIVADO TEMPORARIAMENTE PARA TESTES
    syncInterval: 900000, // 15 minutes
  });

  // Mutation para sincronização manual
  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sync/evolucoes", {
        unitIds: "22,23",
        forceUpdate: false,
      });
      return response.json();
    },
    onSuccess: (data) => {
      refetch();
      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem('lastSyncTime', now.toISOString());
      toast({
        title: "Sincronização Manual Concluída",
        description: `Dados do N8N atualizados`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na Sincronização",
        description: error.message || "Não foi possível sincronizar com o N8N.",
        variant: "destructive",
      });
    },
  });

  const { data: patients, isLoading, refetch } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: templates } = useQuery<NursingTemplate[]>({
    queryKey: ["/api/templates"],
  });


  const filteredPatients = patients?.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.leito.includes(searchTerm)
  ).sort((a, b) => {
    const leitoA = parseInt(a.leito.replace(/\D/g, '')) || 0;
    const leitoB = parseInt(b.leito.replace(/\D/g, '')) || 0;
    return leitoA - leitoB;
  }) || [];

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
                onClick={() => setLocation("/modules")}
                data-testid="button-home"
                title="Voltar ao Menu Principal"
              >
                <Home className="w-5 h-5 text-primary" />
              </Button>
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
                {isAutoSyncing && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-xs font-medium text-primary mt-1 w-fit">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Sincronizando...
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Botão de Sincronização Manual N8N */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => manualSyncMutation.mutate()}
                  disabled={manualSyncMutation.isPending}
                  data-testid="button-manual-n8n-sync"
                  title="Sincronização Manual N8N"
                  className="bg-chart-3 hover:bg-chart-3/90 text-white"
                >
                  {manualSyncMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Sync N8N
                    </>
                  )}
                </Button>
                {lastSyncTime && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-last-sync">
                    <Clock className="w-3 h-3" />
                    {lastSyncTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })} {lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {!lastSyncTime && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-last-sync">
                    <Clock className="w-3 h-3" />
                    Nunca sincronizado
                  </span>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => triggerSync()}
                disabled={isAutoSyncing}
                data-testid="button-sync"
                title="Sincronizar dados do N8N"
              >
                <RefreshCcw className={`w-5 h-5 ${isAutoSyncing ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  if (patients?.length) {
                    void exportPatientsToExcel(patients);
                  }
                }}
                disabled={!patients?.length}
                data-testid="button-export-excel"
                title="Exportar para Excel"
              >
                <FileSpreadsheet className="w-5 h-5" />
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
                <SheetContent className="w-full sm:max-w-md max-h-screen overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Cloud className="w-5 h-5" />
                      Importar e Sincronizar Dados
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    {/* Section: Template Selection */}
                    <div className="space-y-3 pb-4 border-b">
                      <label className="text-sm font-medium block">Template da Unidade</label>
                      <SelectPrimitive.Root 
                        value={selectedTemplate} 
                        onValueChange={setSelectedTemplate}
                      >
                        <SelectPrimitive.Trigger 
                          className="flex items-center justify-between w-full px-3 py-2 border rounded-md bg-background"
                          data-testid="select-template-handover"
                        >
                          <SelectPrimitive.Value placeholder="Selecione um template..." />
                          <ChevronDown className="w-4 h-4 opacity-50" />
                        </SelectPrimitive.Trigger>
                        <SelectPrimitive.Content className="border rounded-md bg-card shadow-md">
                          <SelectPrimitive.Viewport className="p-2">
                            {templates?.map((t) => (
                              <SelectPrimitive.Item 
                                key={t.id}
                                value={t.id}
                                className="px-3 py-2 hover:bg-accent rounded cursor-pointer"
                              >
                                <SelectPrimitive.ItemText>{t.name}</SelectPrimitive.ItemText>
                              </SelectPrimitive.Item>
                            ))}
                          </SelectPrimitive.Viewport>
                        </SelectPrimitive.Content>
                      </SelectPrimitive.Root>
                    </div>

                    {/* Section: Manual Import */}
                    <div className="space-y-3 pb-4 border-b">
                      <h3 className="text-sm font-semibold">Importar Evolução (N8N)</h3>
                      <ImportEvolucoes autoSync={false} syncInterval={0} templateId={selectedTemplate} />
                    </div>

                    {/* Section: Sync Single Patient */}
                    <div className="space-y-3 pb-4 border-b">
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

                    {/* Section: Sync All Patients */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Sincronizar Todos os Pacientes:</p>
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
                            Sincronizando {patients?.length} pacientes...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Sincronizar {patients?.length || 0} Pacientes
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
              <Sheet open={aiOpen} onOpenChange={setAiOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    data-testid="button-ai-analysis"
                    title="Análise de IA"
                  >
                    <Brain className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-lg max-h-screen overflow-hidden flex flex-col">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      Análise de IA - Passagem de Plantão
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto mt-4">
                    {!aiAnalysis && !analyzePatientsMutation.isPending && !clinicalAnalysisMutation.isPending && (
                      <div className="text-center py-6 space-y-6">
                        <Brain className="w-16 h-16 mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground text-sm">
                          Utilize a IA para gerar análises inteligentes dos pacientes.
                        </p>
                        
                        <div className="space-y-3">
                          <Button
                            onClick={() => analyzePatientsMutation.mutate()}
                            disabled={!patients?.length}
                            className="w-full"
                            data-testid="button-run-ai-analysis"
                          >
                            <Brain className="w-4 h-4 mr-2" />
                            Resumo Geral ({patients?.length || 0} Pacientes)
                          </Button>
                          
                          <Button
                            onClick={() => clinicalAnalysisMutation.mutate()}
                            disabled={!patients?.length}
                            variant="secondary"
                            className="w-full"
                            data-testid="button-run-clinical-analysis"
                          >
                            <Activity className="w-4 h-4 mr-2" />
                            Análise Clínica por Leito
                          </Button>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          A análise clínica identifica alertas, riscos e gaps de documentação para cada paciente.
                        </p>
                      </div>
                    )}
                    
                    {clinicalAnalysisMutation.isPending && (
                      <div className="text-center py-12 space-y-4">
                        <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                        <p className="text-muted-foreground">
                          Analisando cada paciente individualmente...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Isso pode levar alguns minutos para {patients?.length || 0} pacientes.
                        </p>
                      </div>
                    )}

                    {analyzePatientsMutation.isPending && (
                      <div className="text-center py-12 space-y-4">
                        <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                        <p className="text-muted-foreground">
                          Analisando dados dos pacientes...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Isso pode levar alguns segundos.
                        </p>
                      </div>
                    )}

                    {aiAnalysis && !analyzePatientsMutation.isPending && (
                      <div className="space-y-4">
                        <Card className="p-4 bg-primary/5 border-primary/20">
                          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Resumo Geral
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {aiAnalysis.resumoGeral}
                          </p>
                        </Card>

                        <Card className="p-4">
                          <h3 className="font-semibold text-sm mb-3">Estatísticas</h3>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-muted/50 rounded-lg p-2">
                              <div className="text-2xl font-bold text-primary">{aiAnalysis.estatisticas.total}</div>
                              <div className="text-xs text-muted-foreground">Total</div>
                            </div>
                            <div className="bg-chart-3/10 rounded-lg p-2">
                              <div className="text-2xl font-bold text-chart-3">{aiAnalysis.estatisticas.altaComplexidade}</div>
                              <div className="text-xs text-muted-foreground">Alta Complexidade</div>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2">
                              <div className="text-2xl font-bold">{aiAnalysis.estatisticas.mediaBraden?.toFixed(1) || "-"}</div>
                              <div className="text-xs text-muted-foreground">Média Braden</div>
                            </div>
                          </div>
                        </Card>

                        {aiAnalysis.pacientesCriticos?.length > 0 && (
                          <Card className="p-4 border-destructive/30 bg-destructive/5">
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-destructive">
                              <AlertTriangle className="w-4 h-4" />
                              Pacientes Críticos
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {aiAnalysis.pacientesCriticos.map((leito, idx) => (
                                <Badge key={idx} variant="destructive" className="text-xs">
                                  Leito {leito}
                                </Badge>
                              ))}
                            </div>
                          </Card>
                        )}

                        {aiAnalysis.alertasGerais?.length > 0 && (
                          <Card className="p-4">
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Bell className="w-4 h-4" />
                              Alertas para o Plantão
                            </h3>
                            <ul className="space-y-2">
                              {aiAnalysis.alertasGerais.map((alerta, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                  <span className="text-muted-foreground">{alerta}</span>
                                </li>
                              ))}
                            </ul>
                          </Card>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => analyzePatientsMutation.mutate()}
                            data-testid="button-refresh-ai-analysis"
                          >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Atualizar
                          </Button>
                          <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => clinicalAnalysisMutation.mutate()}
                            disabled={clinicalAnalysisMutation.isPending}
                            data-testid="button-run-clinical-from-summary"
                          >
                            <Activity className="w-4 h-4 mr-2" />
                            Análise Clínica
                          </Button>
                        </div>
                      </div>
                    )}

                    {clinicalBatchResult && !clinicalAnalysisMutation.isPending && (
                      <div className="space-y-4">
                        {/* Resumo Executivo */}
                        {clinicalBatchResult.analiseGeral && (
                          <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              Resumo Executivo do Plantão
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {clinicalBatchResult.analiseGeral.resumo_executivo}
                            </p>
                          </Card>
                        )}

                        {/* Indicadores Avançados */}
                        {clinicalBatchResult.analiseGeral?.indicadores && (
                          <Card className="p-4">
                            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-primary" />
                              Indicadores do Plantão
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                                <Users className="w-4 h-4 text-primary" />
                                <div>
                                  <div className="text-lg font-bold">{clinicalBatchResult.analiseGeral.indicadores.total_pacientes}</div>
                                  <div className="text-[10px] text-muted-foreground">Total Pacientes</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                                <Shield className="w-4 h-4 text-blue-500" />
                                <div>
                                  <div className="text-lg font-bold">{clinicalBatchResult.analiseGeral.indicadores.media_braden}</div>
                                  <div className="text-[10px] text-muted-foreground">Média Braden</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                                <Clock className="w-4 h-4 text-orange-500" />
                                <div>
                                  <div className="text-lg font-bold">{clinicalBatchResult.analiseGeral.indicadores.media_dias_internacao}d</div>
                                  <div className="text-[10px] text-muted-foreground">Média Internação</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                                <FileText className="w-4 h-4 text-green-500" />
                                <div>
                                  <div className="text-lg font-bold">{clinicalBatchResult.analiseGeral.indicadores.taxa_completude_documentacao}%</div>
                                  <div className="text-[10px] text-muted-foreground">Completude Doc.</div>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <div className="text-center p-2 bg-red-500/10 rounded-lg">
                                <div className="text-sm font-bold text-red-500">{clinicalBatchResult.analiseGeral.indicadores.pacientes_alta_complexidade}</div>
                                <div className="text-[9px] text-muted-foreground">Alta Complex.</div>
                              </div>
                              <div className="text-center p-2 bg-purple-500/10 rounded-lg">
                                <div className="text-sm font-bold text-purple-500">{clinicalBatchResult.analiseGeral.indicadores.pacientes_com_dispositivos}</div>
                                <div className="text-[9px] text-muted-foreground">C/ Dispositivos</div>
                              </div>
                              <div className="text-center p-2 bg-orange-500/10 rounded-lg">
                                <div className="text-sm font-bold text-orange-500">{clinicalBatchResult.analiseGeral.indicadores.pacientes_com_atb}</div>
                                <div className="text-[9px] text-muted-foreground">Em ATB</div>
                              </div>
                              <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                                <div className="text-sm font-bold text-blue-500">{clinicalBatchResult.analiseGeral.indicadores.pacientes_acamados}</div>
                                <div className="text-[9px] text-muted-foreground">Acamados</div>
                              </div>
                              <div className="text-center p-2 bg-yellow-500/10 rounded-lg">
                                <div className="text-sm font-bold text-yellow-600">{clinicalBatchResult.analiseGeral.indicadores.pacientes_risco_queda_alto}</div>
                                <div className="text-[9px] text-muted-foreground">Risco Queda</div>
                              </div>
                              <div className="text-center p-2 bg-pink-500/10 rounded-lg">
                                <div className="text-sm font-bold text-pink-500">{clinicalBatchResult.analiseGeral.indicadores.pacientes_lesao_pressao}</div>
                                <div className="text-[9px] text-muted-foreground">Risco LPP</div>
                              </div>
                            </div>
                          </Card>
                        )}

                        {/* Classificação por Nível */}
                        <Card className="p-4">
                          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Classificação por Nível
                          </h3>
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="bg-red-500/20 rounded-lg p-2">
                              <div className="text-xl font-bold text-red-500">{clinicalBatchResult.summary.vermelho}</div>
                              <div className="text-[10px] text-muted-foreground">Críticos</div>
                            </div>
                            <div className="bg-yellow-500/20 rounded-lg p-2">
                              <div className="text-xl font-bold text-yellow-600">{clinicalBatchResult.summary.amarelo}</div>
                              <div className="text-[10px] text-muted-foreground">Alertas</div>
                            </div>
                            <div className="bg-green-500/20 rounded-lg p-2">
                              <div className="text-xl font-bold text-green-500">{clinicalBatchResult.summary.verde}</div>
                              <div className="text-[10px] text-muted-foreground">OK</div>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2">
                              <div className="text-xl font-bold">{clinicalBatchResult.total}</div>
                              <div className="text-[10px] text-muted-foreground">Total</div>
                            </div>
                          </div>
                        </Card>

                        {/* Alertas Críticos para Enfermagem */}
                        {clinicalBatchResult.analiseGeral?.alertas_criticos_enfermagem && 
                         clinicalBatchResult.analiseGeral.alertas_criticos_enfermagem.length > 0 && (
                          <Card className="p-4 border-red-500/30 bg-red-500/5">
                            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-500">
                              <AlertTriangle className="w-4 h-4" />
                              ALERTAS CRÍTICOS
                            </h3>
                            <ul className="space-y-2">
                              {clinicalBatchResult.analiseGeral.alertas_criticos_enfermagem.map((alerta, idx) => (
                                <li key={idx} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  <span>{alerta}</span>
                                </li>
                              ))}
                            </ul>
                          </Card>
                        )}

                        {/* Protocolos de Enfermagem por Categoria */}
                        {clinicalBatchResult.analiseGeral?.protocolos_enfermagem && 
                         clinicalBatchResult.analiseGeral.protocolos_enfermagem.length > 0 && (
                          <Card className="p-4">
                            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Stethoscope className="w-4 h-4 text-primary" />
                              Protocolos de Enfermagem Ativos
                            </h3>
                            <div className="space-y-3">
                              {clinicalBatchResult.analiseGeral.protocolos_enfermagem.map((protocolo, idx) => {
                                const getProtocolIcon = (icone: string) => {
                                  switch(icone) {
                                    case "AlertTriangle": return <AlertTriangle className="w-4 h-4" />;
                                    case "Shield": return <Shield className="w-4 h-4" />;
                                    case "Bug": return <Bug className="w-4 h-4" />;
                                    case "Wind": return <Wind className="w-4 h-4" />;
                                    case "Utensils": return <Utensils className="w-4 h-4" />;
                                    case "Heart": return <Heart className="w-4 h-4" />;
                                    default: return <Activity className="w-4 h-4" />;
                                  }
                                };
                                const getProtocolColor = (cor: string) => {
                                  switch(cor) {
                                    case "yellow": return "border-yellow-500/30 bg-yellow-500/5";
                                    case "red": return "border-red-500/30 bg-red-500/5";
                                    case "orange": return "border-orange-500/30 bg-orange-500/5";
                                    case "blue": return "border-blue-500/30 bg-blue-500/5";
                                    case "green": return "border-green-500/30 bg-green-500/5";
                                    case "purple": return "border-purple-500/30 bg-purple-500/5";
                                    default: return "border-muted bg-muted/10";
                                  }
                                };
                                const getTextColor = (cor: string) => {
                                  switch(cor) {
                                    case "yellow": return "text-yellow-600";
                                    case "red": return "text-red-500";
                                    case "orange": return "text-orange-500";
                                    case "blue": return "text-blue-500";
                                    case "green": return "text-green-500";
                                    case "purple": return "text-purple-500";
                                    default: return "text-muted-foreground";
                                  }
                                };
                                return (
                                  <div key={idx} className={`p-3 rounded-lg border ${getProtocolColor(protocolo.cor)}`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className={`flex items-center gap-2 font-semibold text-sm ${getTextColor(protocolo.cor)}`}>
                                        {getProtocolIcon(protocolo.icone)}
                                        {protocolo.categoria}
                                      </div>
                                      <Badge variant="secondary" className="text-[10px]">
                                        {protocolo.quantidade} leito(s)
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">{protocolo.protocolo_resumo}</p>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {protocolo.leitos_afetados.slice(0, 6).map((leito, lIdx) => (
                                        <Badge key={lIdx} variant="outline" className="text-[9px]">
                                          {leito}
                                        </Badge>
                                      ))}
                                      {protocolo.leitos_afetados.length > 6 && (
                                        <Badge variant="outline" className="text-[9px]">
                                          +{protocolo.leitos_afetados.length - 6}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-[10px] font-semibold uppercase text-muted-foreground">Ações:</div>
                                      {protocolo.acoes_principais.slice(0, 3).map((acao, aIdx) => (
                                        <div key={aIdx} className="text-[10px] text-muted-foreground flex items-start gap-1">
                                          <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                          <span>{acao}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </Card>
                        )}

                        {/* Leitos Detalhados */}
                        {clinicalBatchResult.analiseGeral?.leitos_detalhados && 
                         clinicalBatchResult.analiseGeral.leitos_detalhados.length > 0 && (
                          <Card className="p-4">
                            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Bed className="w-4 h-4 text-primary" />
                              Detalhes por Leito ({clinicalBatchResult.analiseGeral.leitos_detalhados.length})
                            </h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                              {clinicalBatchResult.analiseGeral.leitos_detalhados.map((leito, idx) => (
                                <div 
                                  key={idx} 
                                  className={`p-3 rounded-lg border ${
                                    leito.nivel_alerta === "VERMELHO" 
                                      ? "border-red-500/30 bg-red-500/5" 
                                      : leito.nivel_alerta === "AMARELO"
                                      ? "border-yellow-500/30 bg-yellow-500/5"
                                      : "border-green-500/30 bg-green-500/5"
                                  }`}
                                >
                                  {/* Header do Leito */}
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        className={`text-xs ${
                                          leito.nivel_alerta === "VERMELHO" 
                                            ? "bg-red-500 text-white" 
                                            : leito.nivel_alerta === "AMARELO"
                                            ? "bg-yellow-500 text-black"
                                            : "bg-green-500 text-white"
                                        }`}
                                      >
                                        {leito.leito}
                                      </Badge>
                                      <span className="text-xs font-medium truncate max-w-[150px]">{leito.nome}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[9px]">
                                      {leito.tipo_enfermidade}
                                    </Badge>
                                  </div>

                                  {/* Diagnóstico */}
                                  <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                    <span className="font-medium">Dx:</span> {leito.diagnostico_principal}
                                  </div>

                                  {/* Indicadores do Leito */}
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    <Badge variant="secondary" className="text-[9px]">
                                      Braden: {leito.braden}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[9px]">
                                      {leito.dias_internacao}d internado
                                    </Badge>
                                    <Badge variant="secondary" className="text-[9px]">
                                      Mob: {leito.mobilidade}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[9px]">
                                      Score: {leito.score_qualidade}%
                                    </Badge>
                                  </div>

                                  {/* Riscos Identificados */}
                                  {leito.riscos_identificados.length > 0 && (
                                    <div className="mb-2">
                                      <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Riscos:</div>
                                      <div className="flex flex-wrap gap-1">
                                        {leito.riscos_identificados.map((risco, rIdx) => (
                                          <Badge 
                                            key={rIdx} 
                                            variant="outline" 
                                            className={`text-[9px] ${
                                              risco.nivel === "ALTO" 
                                                ? "border-red-500/50 text-red-500" 
                                                : risco.nivel === "MODERADO"
                                                ? "border-yellow-500/50 text-yellow-600"
                                                : "border-green-500/50 text-green-500"
                                            }`}
                                          >
                                            {risco.tipo}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Protocolos Ativos */}
                                  {leito.protocolos_ativos.length > 0 && (
                                    <div className="mb-2">
                                      <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Protocolos:</div>
                                      {leito.protocolos_ativos.map((protocolo, pIdx) => (
                                        <div key={pIdx} className="text-[10px] text-muted-foreground flex items-start gap-1 mb-1">
                                          <Stethoscope className="w-3 h-3 mt-0.5 flex-shrink-0 text-primary" />
                                          <div>
                                            <span className="font-medium">{protocolo.nome}</span>
                                            {protocolo.frequencia && <span className="text-[9px]"> ({protocolo.frequencia})</span>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Dispositivos e ATB */}
                                  {(leito.dispositivos.length > 0 || leito.antibioticos.length > 0) && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      {leito.dispositivos.length > 0 && (
                                        <div className="flex items-center gap-1">
                                          <Stethoscope className="w-3 h-3 text-purple-500" />
                                          <span className="text-[9px] text-muted-foreground">{leito.dispositivos.length} disp.</span>
                                        </div>
                                      )}
                                      {leito.antibioticos.length > 0 && (
                                        <div className="flex items-center gap-1">
                                          <Pill className="w-3 h-3 text-orange-500" />
                                          <span className="text-[9px] text-muted-foreground">{leito.antibioticos.length} ATB</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Recomendações de Enfermagem */}
                                  {leito.recomendacoes_enfermagem.length > 0 && (
                                    <div>
                                      <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Recomendações:</div>
                                      {leito.recomendacoes_enfermagem.slice(0, 2).map((rec, rIdx) => (
                                        <div key={rIdx} className="text-[10px] text-muted-foreground flex items-start gap-1">
                                          <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-primary" />
                                          <span>{rec}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Gaps de Documentação */}
                                  {leito.gaps_documentacao.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-dashed">
                                      <div className="text-[10px] font-semibold uppercase text-orange-500 mb-1">Gaps de Documentação:</div>
                                      <div className="flex flex-wrap gap-1">
                                        {leito.gaps_documentacao.map((gap, gIdx) => (
                                          <Badge key={gIdx} variant="outline" className="text-[9px] border-orange-500/50 text-orange-500">
                                            {gap}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}

                        {/* Recomendações Gerais para o Plantão */}
                        {clinicalBatchResult.analiseGeral?.recomendacoes_gerais_plantao && 
                         clinicalBatchResult.analiseGeral.recomendacoes_gerais_plantao.length > 0 && (
                          <Card className="p-4 border-primary/20 bg-primary/5">
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-primary" />
                              Recomendações Gerais
                            </h3>
                            <ul className="space-y-1">
                              {clinicalBatchResult.analiseGeral.recomendacoes_gerais_plantao.map((rec, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </Card>
                        )}

                        {/* Falhas */}
                        {clinicalBatchResult.failedPatients && clinicalBatchResult.failedPatients.length > 0 && (
                          <Card className="p-4 border-muted bg-muted/10">
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-muted-foreground">
                              <AlertTriangle className="w-4 h-4" />
                              Falhas na Análise ({clinicalBatchResult.failedPatients.length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {clinicalBatchResult.failedPatients.map((leito, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs text-muted-foreground">
                                  {leito}
                                </Badge>
                              ))}
                            </div>
                          </Card>
                        )}

                        <p className="text-xs text-muted-foreground text-center">
                          {clinicalBatchResult.success}/{clinicalBatchResult.total} pacientes analisados.
                        </p>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => clinicalAnalysisMutation.mutate()}
                          disabled={clinicalAnalysisMutation.isPending}
                          data-testid="button-refresh-clinical-analysis"
                        >
                          <RefreshCcw className="w-4 h-4 mr-2" />
                          Refazer Análise Clínica
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
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
              <Button 
                className="hidden sm:flex" 
                data-testid="button-print"
                onClick={() => window.print()}
              >
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

        {isLoading ? (
          <Card className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </Card>
        ) : (
          <>
            {/* Print Header - Hidden on screen, visible on print */}
            <div className="print-header">
              <div className="logo">11Care - Passagem de Plantão (SBAR)</div>
              <div className="title">Relatório de Passagem de Plantão</div>
              <div className="timestamp">Gerado em: {new Date().toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}</div>
            </div>

            <Card className="overflow-hidden">
            <div className="overflow-x-auto print:max-h-none max-h-[calc(100vh-320px)] overflow-y-auto">
              <table className="w-full text-[11px] border-collapse print:text-[6.5px]">
                <thead className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground sticky top-0 z-20">
                  <tr>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap sticky left-0 bg-primary z-30">LEITO</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[60px]">ALERTA<br/>IA</th>
                    <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[80px]">ENFERMARIA</th>
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
                  {filteredPatients.map((patient, idx) => {
                    const getRowBackground = () => {
                      if (patient.alerta === "critical") {
                        return "bg-destructive/10 hover:bg-destructive/20";
                      }
                      if (patient.alerta === "medium") {
                        return "bg-orange-400/15 hover:bg-orange-400/25 dark:bg-orange-500/15 dark:hover:bg-orange-500/25";
                      }
                      if (patient.status === "complete") {
                        return "bg-emerald-500/15 hover:bg-emerald-500/25 dark:bg-emerald-400/15 dark:hover:bg-emerald-400/25";
                      }
                      if (patient.status === "pending") {
                        return "bg-yellow-400/20 hover:bg-yellow-400/30 dark:bg-yellow-500/20 dark:hover:bg-yellow-500/30";
                      }
                      return idx % 2 === 0 ? "bg-muted/30 hover:bg-muted/50" : "hover:bg-muted/30";
                    };
                    
                    return (
                    <tr 
                      key={patient.id}
                      className={`transition-colors cursor-pointer ${getRowBackground()}`}
                      onClick={() => openPatientDetails(patient)}
                      data-testid={`row-patient-${patient.id}`}
                    >
                      <td className="px-2 py-2 text-center font-bold text-primary border border-border sticky left-0 bg-inherit z-10">{patient.leito}</td>
                      <td className="px-2 py-2 text-center border border-border">
                        {(() => {
                          const insights = patient.clinicalInsights as ClinicalInsights | null | undefined;
                          if (!insights || !insights.nivel_alerta) {
                            return <span className="text-muted-foreground text-[9px]">-</span>;
                          }
                          const nivel = insights.nivel_alerta;
                          const score = insights.score_qualidade ?? 0;
                          const categoria = insights.categoria_qualidade ?? "";
                          return (
                            <Badge 
                              variant="secondary"
                              className={`text-[9px] font-bold px-1.5 py-0.5 ${
                                nivel === "VERMELHO" 
                                  ? "bg-red-500 text-white hover:bg-red-600" 
                                  : nivel === "AMARELO"
                                  ? "bg-yellow-500 text-black hover:bg-yellow-600"
                                  : "bg-green-500 text-white hover:bg-green-600"
                              }`}
                              data-testid={`badge-alert-${patient.id}`}
                              title={`Score: ${score}% - ${categoria}`}
                            >
                              {nivel === "VERMELHO" ? (
                                <AlertTriangle className="w-3 h-3" />
                              ) : nivel === "AMARELO" ? (
                                <Activity className="w-3 h-3" />
                              ) : (
                                <CheckCircle className="w-3 h-3" />
                              )}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="px-2 py-2 text-[10px] text-center border border-border">{patient.dsEnfermaria || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.especialidadeRamal || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">
                        <div className="font-semibold">{patient.nome}</div>
                        <div className="text-muted-foreground">{patient.registro || "-"}</div>
                        <div className="text-muted-foreground">{patient.dataNascimento || "-"}</div>
                      </td>
                      <td className="px-2 py-2 text-[10px] text-center border border-border">{patient.dataInternacao || "-"}</td>
                      <td className="px-2 py-2 text-[10px] text-center border border-border">{patient.braden || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.diagnostico || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.alergias || "-"}</td>
                      <td className="px-2 py-2 text-[10px] text-center border border-border">{patient.mobilidade || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.dieta || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.eliminacoes || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.dispositivos || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.atb || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.curativos || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.aporteSaturacao || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.exames || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.cirurgia || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.observacoes || "-"}</td>
                      <td className="px-2 py-2 text-[10px] border border-border">{patient.previsaoAlta || "-"}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </Card>
          </>
        )}
      </div>

      {/* Modal de Detalhes do Paciente com Análise Individual */}
      <Dialog open={patientDetailsOpen} onOpenChange={setPatientDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Badge className="bg-primary text-primary-foreground px-3 py-1">
                Leito {selectedPatient?.leito}
              </Badge>
              <span className="text-lg">{selectedPatient?.nome}</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedPatient && (
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
              <div className="space-y-4">
                {/* Informações Básicas */}
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Informações do Paciente</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Registro:</span>{" "}
                      <span className="font-medium">{selectedPatient.registro || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data Nascimento:</span>{" "}
                      <span className="font-medium">{selectedPatient.dataNascimento || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data Internação:</span>{" "}
                      <span className="font-medium">{selectedPatient.dataInternacao || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Enfermaria:</span>{" "}
                      <span className="font-medium">{selectedPatient.dsEnfermaria || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Diagnóstico:</span>{" "}
                      <span className="font-medium">{selectedPatient.diagnostico || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Alergias:</span>{" "}
                      <span className="font-medium text-red-600">{selectedPatient.alergias || "Nenhuma informada"}</span>
                    </div>
                  </div>
                </Card>

                {/* Informações Clínicas */}
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Dados Clínicos</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Braden:</span>{" "}
                      <span className={`font-medium ${parseInt(selectedPatient.braden || "0") < 12 ? "text-red-600" : parseInt(selectedPatient.braden || "0") < 15 ? "text-yellow-600" : ""}`}>
                        {selectedPatient.braden || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mobilidade:</span>{" "}
                      <span className="font-medium">{selectedPatient.mobilidade || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dieta:</span>{" "}
                      <span className="font-medium">{selectedPatient.dieta || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Eliminações:</span>{" "}
                      <span className="font-medium">{selectedPatient.eliminacoes || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Dispositivos:</span>{" "}
                      <span className="font-medium">{selectedPatient.dispositivos || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">ATB:</span>{" "}
                      <span className="font-medium">{selectedPatient.atb || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Aporte/Saturação:</span>{" "}
                      <span className="font-medium">{selectedPatient.aporteSaturacao || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Curativos:</span>{" "}
                      <span className="font-medium">{selectedPatient.curativos || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Observações:</span>{" "}
                      <span className="font-medium">{selectedPatient.observacoes || "-"}</span>
                    </div>
                  </div>
                </Card>

                {/* Análise Clínica IA */}
                <Card className="p-4 border-primary/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      Análise Clínica por IA
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => individualAnalysisMutation.mutate(selectedPatient.id)}
                      disabled={individualAnalysisMutation.isPending}
                      data-testid="button-analyze-patient"
                    >
                      {individualAnalysisMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Activity className="w-4 h-4 mr-2" />
                          {individualAnalysis ? "Reanalisar" : "Analisar"}
                        </>
                      )}
                    </Button>
                  </div>

                  {!individualAnalysis && !individualAnalysisMutation.isPending && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Clique em "Analisar" para obter insights clínicos e recomendações personalizadas.
                    </p>
                  )}

                  {individualAnalysis && (
                    <div className="space-y-4">
                      {/* Nível de Alerta */}
                      <div className="flex items-center gap-3">
                        <Badge 
                          className={`px-3 py-1 ${
                            individualAnalysis.nivel_alerta === "VERMELHO"
                              ? "bg-red-500 text-white"
                              : individualAnalysis.nivel_alerta === "AMARELO"
                              ? "bg-yellow-500 text-black"
                              : "bg-green-500 text-white"
                          }`}
                        >
                          {individualAnalysis.nivel_alerta === "VERMELHO" && <AlertTriangle className="w-4 h-4 mr-1" />}
                          {individualAnalysis.nivel_alerta === "AMARELO" && <Activity className="w-4 h-4 mr-1" />}
                          {individualAnalysis.nivel_alerta === "VERDE" && <CheckCircle className="w-4 h-4 mr-1" />}
                          {individualAnalysis.nivel_alerta}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Score: {individualAnalysis.score_qualidade}% - {individualAnalysis.categoria_qualidade}
                        </span>
                      </div>

                      {/* Alertas Principais */}
                      {individualAnalysis.principais_alertas && individualAnalysis.principais_alertas.length > 0 && (
                        <div className="border-l-2 border-red-500 pl-3">
                          <h4 className="font-semibold text-xs text-red-500 uppercase mb-2">Alertas Identificados</h4>
                          <ul className="space-y-1">
                            {individualAnalysis.principais_alertas.map((alerta, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                                  alerta.nivel === "VERMELHO" ? "text-red-500" :
                                  alerta.nivel === "AMARELO" ? "text-yellow-500" : "text-green-500"
                                }`} />
                                <span>{alerta.titulo}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Gaps Críticos */}
                      {individualAnalysis.gaps_criticos && individualAnalysis.gaps_criticos.length > 0 && (
                        <div className="border-l-2 border-yellow-500 pl-3">
                          <h4 className="font-semibold text-xs text-yellow-600 uppercase mb-2">Gaps de Documentação</h4>
                          <ul className="space-y-1">
                            {individualAnalysis.gaps_criticos.map((gap, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground">• {gap}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recomendações de Enfermagem */}
                      {individualAnalysis.recomendacoes_enfermagem && individualAnalysis.recomendacoes_enfermagem.length > 0 && (
                        <div className="border-l-2 border-primary pl-3">
                          <h4 className="font-semibold text-xs text-primary uppercase mb-2">Recomendações de Enfermagem</h4>
                          <ul className="space-y-1">
                            {individualAnalysis.recomendacoes_enfermagem.map((rec, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Prioridade de Ação */}
                      {individualAnalysis.prioridade_acao && (
                        <Card className="p-3 bg-primary/5 border-primary/20">
                          <h4 className="font-semibold text-xs uppercase mb-1">Prioridade de Ação</h4>
                          <p className="text-sm">{individualAnalysis.prioridade_acao}</p>
                        </Card>
                      )}

                      <p className="text-xs text-muted-foreground text-center">
                        Análise gerada em: {new Date(individualAnalysis.timestamp).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
