import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Patient, Alert } from "@shared/schema";
import type { NursingTemplate } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import * as SelectPrimitive from "@radix-ui/react-select";
import { useAuth } from "@/lib/auth-context";
import {
  Menu, Home, RefreshCcw, Filter, Bell, Printer,
  Loader2, Cloud, Download, FileSpreadsheet, ChevronDown, Brain,
  AlertTriangle, CheckCircle, Activity, Shield, Bug, Wind, Utensils, Heart,
  Clock, FileText, Stethoscope, Users, Pill, Bed, TrendingUp, ChevronRight, History
} from "lucide-react";
import { useSyncPatient } from "@/hooks/use-sync-patient";
import { ImportEvolucoes } from "@/components/ImportEvolucoes";
import { exportPatientsToExcel } from "@/lib/export-to-excel";
import { queryClient } from "@/lib/queryClient";
import { patientsService } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { printShiftHandover } from "@/components/print-shift-handover";

import {
  StatsCards,
  SearchFilterBar,
  PatientTable,
  PatientDetailsModal,
  PatientHistorySheet,
  ClinicalInsightsStatsSheet,
  type AIAnalysisResult,
  type ClinicalBatchResult,
  type ClinicalInsights,
  type PatientStats,
} from "@/components/shift-handover";

export default function ShiftHandoverPage() {
  const { user } = useAuth();
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterCritical, setFilterCritical] = useState(false);
  const { syncSinglePatient, syncMultiplePatients } = useSyncPatient();
  const { toast } = useToast();

  const analyzePatientsMutation = useMutation({
    mutationFn: () => patientsService.analyzeAll(),
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
    mutationFn: () => patientsService.clinicalAnalysisBatch(),
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
    mutationFn: (patientId: string) => patientsService.clinicalAnalysisIndividual(patientId),
    onSuccess: (data: { insights: ClinicalInsights; analysis: unknown }) => {
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

  const openPatientDetails = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setIndividualAnalysis((patient.clinicalInsights as ClinicalInsights) || null);
    setPatientDetailsOpen(true);
  }, []);
  
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      setIsSyncing(true);
      
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      
      return patientsService.syncManualWithAI("22,23", false);
    },
    onSuccess: () => {
      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem('lastSyncTime', now.toISOString());
      
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      toast({
        title: "Sincronização Iniciada",
        description: "Dados sincronizados. Análise de IA em processamento (aguarde ~30s)...",
      });
      
      pollTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
        pollTimerRef.current = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
          setIsSyncing(false);
          pollTimerRef.current = null;
          toast({
            title: "Sincronização Concluída",
            description: "Dados e análises de IA atualizados com sucesso.",
          });
        }, 20000);
      }, 15000);
    },
    onError: (error: Error) => {
      setIsSyncing(false);
      toast({
        title: "Erro na Sincronização",
        description: error.message || "Não foi possível sincronizar com o N8N.",
        variant: "destructive",
      });
    },
  });

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: templates } = useQuery<NursingTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const isAICritical = useCallback((patient: Patient): boolean => {
    const insights = patient.clinicalInsights as ClinicalInsights | null;
    return insights?.nivel_alerta === "VERMELHO";
  }, []);

  const isAIAlert = useCallback((patient: Patient): boolean => {
    const insights = patient.clinicalInsights as ClinicalInsights | null;
    return insights?.nivel_alerta === "AMARELO";
  }, []);

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    return patients.filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.leito.includes(searchTerm);
      const matchesCriticalFilter = !filterCritical || isAICritical(p);
      return matchesSearch && matchesCriticalFilter;
    }).sort((a, b) => {
      const leitoA = parseInt(a.leito.replace(/\D/g, '')) || 0;
      const leitoB = parseInt(b.leito.replace(/\D/g, '')) || 0;
      return leitoA - leitoB;
    });
  }, [patients, searchTerm, filterCritical, isAICritical]);

  const stats: PatientStats = useMemo(() => ({
    complete: patients?.filter(p => p.status === "complete").length || 0,
    pending: patients?.filter(p => p.status === "pending").length || 0,
    alert: patients?.filter(p => isAIAlert(p)).length || 0,
    critical: patients?.filter(p => isAICritical(p)).length || 0,
    total: patients?.length || 0
  }), [patients, isAIAlert, isAICritical]);

  const getProtocolIcon = useCallback((icone: string) => {
    switch(icone) {
      case "AlertTriangle": return <AlertTriangle className="w-4 h-4" />;
      case "Shield": return <Shield className="w-4 h-4" />;
      case "Bug": return <Bug className="w-4 h-4" />;
      case "Wind": return <Wind className="w-4 h-4" />;
      case "Utensils": return <Utensils className="w-4 h-4" />;
      case "Heart": return <Heart className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  }, []);

  const getProtocolColor = useCallback((cor: string) => {
    switch(cor) {
      case "yellow": return "border-yellow-500/30 bg-yellow-500/5";
      case "red": return "border-red-500/30 bg-red-500/5";
      case "orange": return "border-orange-500/30 bg-orange-500/5";
      case "blue": return "border-blue-500/30 bg-blue-500/5";
      case "green": return "border-green-500/30 bg-green-500/5";
      case "purple": return "border-purple-500/30 bg-purple-500/5";
      default: return "border-muted bg-muted/10";
    }
  }, []);

  const getTextColor = useCallback((cor: string) => {
    switch(cor) {
      case "yellow": return "text-yellow-600";
      case "red": return "text-red-500";
      case "orange": return "text-orange-500";
      case "blue": return "text-blue-500";
      case "green": return "text-green-500";
      case "purple": return "text-purple-500";
      default: return "text-muted-foreground";
    }
  }, []);

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
                onClick={() => setLocation("/patients-history")}
                data-testid="button-patients-history"
                title="Histórico de Pacientes (Altas e Transferências)"
              >
                <History className="w-5 h-5 text-primary" />
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
                {(manualSyncMutation.isPending || isSyncing) && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-xs font-medium text-primary mt-1 w-fit">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Sincronizando com IA...
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => manualSyncMutation.mutate()}
                  disabled={manualSyncMutation.isPending || isSyncing}
                  data-testid="button-manual-n8n-sync"
                  title="Sincronizar dados do N8N com análise de IA"
                  className="bg-chart-3 hover:bg-chart-3/90 text-white"
                >
                  {(manualSyncMutation.isPending || isSyncing) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Sync N8N + IA
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
              {user?.role === 'admin' && (
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
              )}
              
              
              
              {/* AI Analysis Sheet */}
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
                            variant="outline"
                            onClick={() => clinicalAnalysisMutation.mutate()}
                            disabled={!patients?.length || clinicalAnalysisMutation.isPending}
                            className="w-full"
                            data-testid="button-clinical-analysis"
                          >
                            {clinicalAnalysisMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Analisando...
                              </>
                            ) : (
                              <>
                                <Stethoscope className="w-4 h-4 mr-2" />
                                Análise Clínica por Leito
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {(analyzePatientsMutation.isPending || clinicalAnalysisMutation.isPending) && (
                      <div className="text-center py-12">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
                        <p className="text-muted-foreground">Gerando análise de IA...</p>
                      </div>
                    )}

                    {aiAnalysis && !clinicalBatchResult && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Brain className="w-4 h-4 text-primary" />
                            Resumo Geral da Enfermaria
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAiAnalysis(null)}
                          >
                            Nova Análise
                          </Button>
                        </div>

                        <Card className="p-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Estatísticas
                          </h4>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-primary/10 rounded-lg p-2">
                              <div className="text-xl font-bold">{aiAnalysis.estatisticas.total}</div>
                              <div className="text-[10px] text-muted-foreground">Total Pacientes</div>
                            </div>
                            <div className="bg-red-500/10 rounded-lg p-2">
                              <div className="text-xl font-bold text-red-500">{aiAnalysis.estatisticas.altaComplexidade}</div>
                              <div className="text-[10px] text-muted-foreground">Alta Complexidade</div>
                            </div>
                            <div className="bg-blue-500/10 rounded-lg p-2">
                              <div className="text-xl font-bold text-blue-500">{aiAnalysis.estatisticas.mediaBraden}</div>
                              <div className="text-[10px] text-muted-foreground">Média Braden</div>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Resumo Geral
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {aiAnalysis.resumoGeral}
                          </p>
                        </Card>

                        {aiAnalysis.pacientesCriticos && aiAnalysis.pacientesCriticos.length > 0 && (
                          <Card className="p-4 border-red-500/30 bg-red-500/5">
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-500">
                              <AlertTriangle className="w-4 h-4" />
                              Pacientes Críticos
                            </h4>
                            <ul className="space-y-2">
                              {aiAnalysis.pacientesCriticos.map((paciente, idx) => (
                                <li key={idx} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  <span>{paciente}</span>
                                </li>
                              ))}
                            </ul>
                          </Card>
                        )}

                        {aiAnalysis.alertasGerais && aiAnalysis.alertasGerais.length > 0 && (
                          <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-yellow-600">
                              <Bell className="w-4 h-4" />
                              Alertas Gerais
                            </h4>
                            <ul className="space-y-2">
                              {aiAnalysis.alertasGerais.map((alerta, idx) => (
                                <li key={idx} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                                  <span className="text-yellow-500 mt-0.5">•</span>
                                  <span>{alerta}</span>
                                </li>
                              ))}
                            </ul>
                          </Card>
                        )}
                      </div>
                    )}

                    {clinicalBatchResult && (
                      <div className="space-y-4">
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

                        {clinicalBatchResult.analiseGeral?.protocolos_enfermagem && 
                         clinicalBatchResult.analiseGeral.protocolos_enfermagem.length > 0 && (
                          <Card className="p-4">
                            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Stethoscope className="w-4 h-4 text-primary" />
                              Protocolos de Enfermagem Ativos
                            </h3>
                            <div className="space-y-3">
                              {clinicalBatchResult.analiseGeral.protocolos_enfermagem.map((protocolo, idx) => (
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
                              ))}
                            </div>
                          </Card>
                        )}

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
                                  <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                    <span className="font-medium">Dx:</span> {leito.diagnostico_principal}
                                  </div>
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

                        {clinicalBatchResult.failedPatients && clinicalBatchResult.failedPatients.length > 0 && (
                          <Card className="p-4 border-muted bg-muted/10">
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-muted-foreground">
                              <AlertTriangle className="w-4 h-4" />
                              Falhas ({clinicalBatchResult.failedPatients.length})
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Pacientes: {clinicalBatchResult.failedPatients.join(", ")}
                            </p>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
              
              {/* Alerts Sheet */}
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
              
              {/* Patient History Sheet */}
              <PatientHistorySheet />
              
              {/* Clinical Insights Stats Sheet */}
              <ClinicalInsightsStatsSheet />
              
              <Button 
                className="hidden sm:flex" 
                data-testid="button-print"
                onClick={() => printShiftHandover(filteredPatients)}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-5 py-6 flex-1">
        <StatsCards 
          stats={stats}
          filterCritical={filterCritical}
          onFilterCriticalToggle={() => setFilterCritical(!filterCritical)}
        />

        <SearchFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterCritical={filterCritical}
          criticalCount={stats.critical}
          onClearFilter={() => setFilterCritical(false)}
        />

        {isLoading ? (
          <Card className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </Card>
        ) : (
          <>
            <div className="print-header hidden">
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

            <PatientTable 
              patients={filteredPatients}
              onPatientClick={openPatientDetails}
            />
          </>
        )}
      </div>

      <PatientDetailsModal
        open={patientDetailsOpen}
        onOpenChange={setPatientDetailsOpen}
        patient={selectedPatient}
        individualAnalysis={individualAnalysis}
        onAnalyze={() => {
          if (selectedPatient) {
            individualAnalysisMutation.mutate(selectedPatient.id);
          }
        }}
        isAnalyzing={individualAnalysisMutation.isPending}
      />
    </div>
  );
}
