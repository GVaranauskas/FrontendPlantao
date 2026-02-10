import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Brain, AlertTriangle, Activity, CheckCircle, Loader2, Edit2, Save, X, Clock, User, History, Trash2, ChevronDown, ChevronUp, Stethoscope, FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { getAccessToken } from "@/lib/auth-token";
import type { Patient } from "@shared/schema";
import type { ClinicalInsights } from "./types";

interface PatientDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  individualAnalysis: ClinicalInsights | null;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export function PatientDetailsModal({
  open,
  onOpenChange,
  patient,
  individualAnalysis,
  onAnalyze,
  isAnalyzing,
}: PatientDetailsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(patient?.notasPaciente || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isEvolucaoMedicaExpanded, setIsEvolucaoMedicaExpanded] = useState(false);
  const [isAnotacaoEnfermagemExpanded, setIsAnotacaoEnfermagemExpanded] = useState(false);
  const maxLength = 200;
  const isAdmin = user?.role === "admin";

  const { data: notesHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["patient-notes-history", patient?.id],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      const token = getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/patients/${patient?.id}/notes-history`, { 
        credentials: "include",
        headers,
      });
      if (!response.ok) throw new Error("Erro ao buscar histórico");
      const result = await response.json();
      return result.data;
    },
    enabled: open && !!patient?.id,
  });

  const { data: noteEvents } = useQuery({
    queryKey: ["patient-note-events", patient?.id],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      const token = getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/patients/${patient?.id}/note-events`, { 
        credentials: "include",
        headers,
      });
      if (!response.ok) throw new Error("Erro ao buscar eventos");
      const result = await response.json();
      return result.data;
    },
    enabled: open && !!patient?.id && isAdmin,
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/patients/${patient?.id}/notes`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ notasPaciente: notes }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao salvar notas");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient-notes-history", patient?.id] });
      setIsEditingNotes(false);
      toast({ title: "Sucesso", description: "Notas atualizadas com sucesso" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const deleteNotesMutation = useMutation({
    mutationFn: async (reason: string | null) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/patients/${patient?.id}/notes`, {
        method: "DELETE",
        headers,
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao excluir nota");
      }
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.refetchQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient-notes-history", patient?.id] });
      queryClient.invalidateQueries({ queryKey: ["patient-note-events", patient?.id] });
      setShowDeleteConfirm(false);
      setDeleteReason("");
      toast({ 
        title: "Nota excluída", 
        description: data.notifiedUser 
          ? "A nota foi excluída e o autor foi notificado." 
          : "A nota foi excluída com sucesso."
      });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const handleDeleteNotes = () => {
    deleteNotesMutation.mutate(deleteReason.trim() || null);
  };

  const handleSaveNotes = () => {
    if (notesValue.length > maxLength) {
      toast({ variant: "destructive", title: "Erro", description: `As notas não podem exceder ${maxLength} caracteres` });
      return;
    }
    updateNotesMutation.mutate(notesValue);
  };

  const handleCancelEdit = () => {
    setNotesValue(patient?.notasPaciente || "");
    setIsEditingNotes(false);
  };

  if (!patient) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Badge className="bg-primary text-primary-foreground px-3 py-1">
              Leito {patient.leito}
            </Badge>
            <span className="text-lg">{patient.nome}</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4 w-full max-w-full">
          <div className="space-y-4 w-full max-w-full overflow-hidden">
            <Card className="p-4 overflow-hidden">
              <h3 className="font-semibold text-sm mb-3">Informações do Paciente</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="min-w-0">
                  <span className="text-muted-foreground">Registro:</span>{" "}
                  <span className="font-medium break-words">{patient.registro || "-"}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Data Nascimento:</span>{" "}
                  <span className="font-medium break-words">{patient.dataNascimento || "-"}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Idade:</span>{" "}
                  <span className="font-bold text-primary">
                    {patient.idade !== null && patient.idade !== undefined 
                      ? `${patient.idade} anos` 
                      : "-"}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Sexo:</span>{" "}
                  <span className="font-medium break-words">{patient.sexo || "-"}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Data Internação:</span>{" "}
                  <span className="font-medium break-words">{patient.dataInternacao || "-"}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Enfermaria:</span>{" "}
                  <span className="font-medium break-words">{patient.dsEnfermaria || "-"}</span>
                </div>
                <div className="col-span-2 min-w-0">
                  <span className="text-muted-foreground">Diagnóstico:</span>{" "}
                  <span className="font-medium break-words">{patient.diagnostico || "-"}</span>
                </div>
                <div className="col-span-2 min-w-0">
                  <span className="text-muted-foreground">Alergias:</span>{" "}
                  <span className="font-medium text-red-600 break-words">{patient.alergias || "Nenhuma informada"}</span>
                </div>
              </div>
            </Card>

            {patient.dsEvolucaoMedica && (
              <Card className="p-4 border-emerald-200 dark:border-emerald-800 overflow-hidden">
                <button
                  onClick={() => setIsEvolucaoMedicaExpanded(!isEvolucaoMedicaExpanded)}
                  className="w-full flex items-center justify-between text-left"
                  data-testid="button-toggle-evolucao-medica"
                >
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                    Evolução Médica
                  </h3>
                  {isEvolucaoMedicaExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {isEvolucaoMedicaExpanded && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 max-h-[300px] overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap break-words">{patient.dsEvolucaoMedica}</p>
                    </div>
                  </div>
                )}
                {!isEvolucaoMedicaExpanded && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Clique para expandir ({patient.dsEvolucaoMedica.length} caracteres)
                  </p>
                )}
              </Card>
            )}

            {patient.dsAnotacaoEnfermagem && (
              <Card className="p-4 border-blue-200 dark:border-blue-800 overflow-hidden">
                <button
                  onClick={() => setIsAnotacaoEnfermagemExpanded(!isAnotacaoEnfermagemExpanded)}
                  className="w-full flex items-center justify-between text-left"
                  data-testid="button-toggle-anotacao-enfermagem"
                >
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Anotações de Enfermagem
                  </h3>
                  {isAnotacaoEnfermagemExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {isAnotacaoEnfermagemExpanded && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 max-h-[300px] overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap break-words">{patient.dsAnotacaoEnfermagem}</p>
                    </div>
                  </div>
                )}
                {!isAnotacaoEnfermagemExpanded && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Clique para expandir ({patient.dsAnotacaoEnfermagem.length} caracteres)
                  </p>
                )}
              </Card>
            )}

            <Card className="p-4 border-primary/30 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Análise Clínica por IA
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                  data-testid="button-analyze-patient"
                >
                  {isAnalyzing ? (
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

              {!individualAnalysis && !isAnalyzing && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Clique em "Analisar" para obter insights clínicos e recomendações personalizadas.
                </p>
              )}

              {individualAnalysis && (
                <div className="space-y-4">
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

                  {individualAnalysis.principais_alertas && individualAnalysis.principais_alertas.length > 0 && (
                    <div className="border-l-2 border-red-500 pl-3">
                      <h4 className="font-semibold text-xs text-red-500 uppercase mb-2">Alertas Identificados</h4>
                      <ul className="space-y-1">
                        {individualAnalysis.principais_alertas.map((alerta, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2 min-w-0">
                            <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                              alerta.nivel === "VERMELHO" ? "text-red-500" :
                              alerta.nivel === "AMARELO" ? "text-yellow-500" : "text-green-500"
                            }`} />
                            <span className="break-words">{alerta.titulo}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {individualAnalysis.gaps_criticos && individualAnalysis.gaps_criticos.length > 0 && (
                    <div className="border-l-2 border-yellow-500 pl-3">
                      <h4 className="font-semibold text-xs text-yellow-600 uppercase mb-2">Gaps de Documentação</h4>
                      <ul className="space-y-1">
                        {individualAnalysis.gaps_criticos.map((gap, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground break-words">• {gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {individualAnalysis.recomendacoes_enfermagem && individualAnalysis.recomendacoes_enfermagem.length > 0 && (
                    <div className="border-l-2 border-primary pl-3">
                      <h4 className="font-semibold text-xs text-primary uppercase mb-2">Recomendações de Enfermagem</h4>
                      <ul className="space-y-1">
                        {individualAnalysis.recomendacoes_enfermagem.map((rec, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2 min-w-0">
                            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="break-words">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {individualAnalysis.prioridade_acao && (
                    <Card className="p-3 bg-primary/5 border-primary/20 overflow-hidden">
                      <h4 className="font-semibold text-xs uppercase mb-1">Prioridade de Ação</h4>
                      <p className="text-sm break-words">{individualAnalysis.prioridade_acao}</p>
                    </Card>
                  )}

                  {/* Classificação Fugulin */}
                  {individualAnalysis.fugulin && individualAnalysis.fugulin.total && (
                    <div className="border-l-2 border-purple-500 pl-3">
                      <h4 className="font-semibold text-xs text-purple-600 uppercase mb-2">
                        Classificação Fugulin
                      </h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {individualAnalysis.fugulin.total} pts — {individualAnalysis.fugulin.categoria}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ~{individualAnalysis.fugulin.horas_enf_24h}h enf/dia
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {individualAnalysis.fugulin.dimensoes.map((dim, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-xs">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-white text-[10px] font-bold flex-shrink-0 ${
                              dim.pts === "?" ? "bg-gray-400" :
                              Number(dim.pts) === 1 ? "bg-green-500" :
                              Number(dim.pts) === 2 ? "bg-yellow-500" :
                              Number(dim.pts) === 3 ? "bg-orange-500" : "bg-red-500"
                            }`}>
                              {dim.pts}
                            </span>
                            <span className="truncate" title={dim.motivo}>{dim.dim}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Escalas Avaliadas */}
                  {individualAnalysis.escalas && (
                    <div className="border-l-2 border-blue-500 pl-3">
                      <h4 className="font-semibold text-xs text-blue-600 uppercase mb-2">
                        Escalas Clínicas
                      </h4>
                      <div className="space-y-1 text-sm">
                        {individualAnalysis.escalas.glasgow?.valor != null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Glasgow:</span>
                            <span className="font-medium">{individualAnalysis.escalas.glasgow.valor} — {individualAnalysis.escalas.glasgow.classificacao}</span>
                          </div>
                        )}
                        {individualAnalysis.escalas.braden?.valor != null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Braden:</span>
                            <span className="font-medium">{individualAnalysis.escalas.braden.valor} — {individualAnalysis.escalas.braden.classificacao}</span>
                          </div>
                        )}
                        {individualAnalysis.escalas.queda?.valor != null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{individualAnalysis.escalas.queda.escala_utilizada}:</span>
                            <span className="font-medium">{individualAnalysis.escalas.queda.valor} — {individualAnalysis.escalas.queda.classificacao}</span>
                          </div>
                        )}
                        {individualAnalysis.escalas.risco_integrado_lpp?.nivel && (
                          <div className="flex justify-between items-center mt-1 pt-1 border-t">
                            <span className="text-muted-foreground text-xs">Risco integrado LPP:</span>
                            <Badge className={`text-xs ${
                              individualAnalysis.escalas.risco_integrado_lpp.nivel === "CRITICO" || individualAnalysis.escalas.risco_integrado_lpp.nivel === "VERMELHO ALTO" ? "bg-red-700 text-white" :
                              individualAnalysis.escalas.risco_integrado_lpp.nivel === "VERMELHO" ? "bg-red-500 text-white" :
                              individualAnalysis.escalas.risco_integrado_lpp.nivel === "LARANJA" ? "bg-orange-500 text-white" :
                              individualAnalysis.escalas.risco_integrado_lpp.nivel === "AMARELO" ? "bg-yellow-500 text-black" :
                              "bg-green-500 text-white"
                            }`}>
                              {individualAnalysis.escalas.risco_integrado_lpp.nivel}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Alertas Fugulin */}
                  {individualAnalysis.alertas_fugulin && individualAnalysis.alertas_fugulin.length > 0 && (
                    <div className="border-l-2 border-orange-500 pl-3">
                      <h4 className="font-semibold text-xs text-orange-600 uppercase mb-2">Alertas de Validação</h4>
                      <ul className="space-y-1">
                        {individualAnalysis.alertas_fugulin.map((alerta, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground break-words">• {alerta}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center">
                    Análise gerada em: {new Date(individualAnalysis.timestamp).toLocaleString("pt-BR")}
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-4 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                  Notas do Paciente
                </h3>
              </div>

              {isEditingNotes ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Informações não clínicas relevantes sobre o paciente</label>
                    <textarea 
                      value={notesValue} 
                      onChange={(e) => setNotesValue(e.target.value.slice(0, maxLength))} 
                      className="w-full min-h-[120px] text-sm border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground" 
                      placeholder="Ex: Familiar solicitou informações, paciente preferiu leito próximo à janela..." 
                      maxLength={maxLength} 
                      disabled={updateNotesMutation.isPending}
                      data-testid="textarea-modal-notes"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs font-medium ${notesValue.length > maxLength * 0.9 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {notesValue.length}/{maxLength} caracteres
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveNotes} 
                          disabled={updateNotesMutation.isPending} 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          data-testid="button-modal-save-notes"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {updateNotesMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button 
                          onClick={handleCancelEdit} 
                          disabled={updateNotesMutation.isPending} 
                          size="sm"
                          variant="secondary"
                          data-testid="button-modal-cancel-notes"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {patient.notasPaciente ? (
                        <div className="bg-background rounded-lg p-4 border border-border">
                          <p className="text-sm text-foreground whitespace-pre-wrap break-all">{patient.notasPaciente}</p>
                        </div>
                      ) : (
                        <div className="bg-background rounded-lg p-4 border border-dashed border-muted-foreground/30">
                          <p className="text-sm text-muted-foreground italic text-center">Nenhuma nota registrada</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => { setNotesValue(patient.notasPaciente || ""); setIsEditingNotes(true); }} 
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-modal-edit-notes"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      {isAdmin && patient.notasPaciente && (
                        <Button 
                          onClick={() => setShowDeleteConfirm(true)} 
                          size="sm"
                          variant="destructive"
                          data-testid="button-modal-delete-notes"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                  {patient.notasUpdatedAt && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Atualizado {formatDistanceToNow(new Date(patient.notasUpdatedAt), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {notesHistory && notesHistory.length > 0 && (
                <div className="mt-4 bg-background rounded-lg border border-border">
                  <div className="bg-muted px-4 py-3 border-b border-border rounded-t-lg">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Histórico de Alterações ({notesHistory.length})
                    </h4>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {isLoadingHistory ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
                      ) : (
                        notesHistory.map((entry: { id: string; alteradoPorNome: string; alteradoEm: string; notaAnterior: string | null; notaNova: string | null }) => (
                          <div key={entry.id} className="bg-muted/50 rounded-lg p-4 border border-border overflow-hidden">
                            <div className="flex items-center justify-between mb-3">
                              <span className="flex items-center gap-2 text-foreground font-medium text-sm">
                                <User className="h-4 w-4 text-blue-600" />
                                {entry.alteradoPorNome}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.alteradoEm).toLocaleString("pt-BR")}
                              </span>
                            </div>
                            <div className="space-y-2 text-xs overflow-hidden w-full max-w-full">
                              {entry.notaAnterior !== null && (
                                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2 overflow-hidden">
                                  <span className="text-red-700 dark:text-red-400 font-semibold">Anterior:</span>
                                  <p className="text-foreground pl-2 break-all whitespace-pre-wrap">{entry.notaAnterior || "(vazio)"}</p>
                                </div>
                              )}
                              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2 overflow-hidden">
                                <span className="text-green-700 dark:text-green-400 font-semibold">Novo:</span>
                                <p className="text-foreground pl-2 break-all whitespace-pre-wrap">{entry.notaNova || "(vazio)"}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && noteEvents && noteEvents.length > 0 && (
                <div className="mt-4 bg-background rounded-lg border border-border overflow-hidden w-full max-w-full">
                  <div className="bg-muted px-4 py-3 border-b border-border rounded-t-lg">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Trilha de Auditoria ({noteEvents.length})
                    </h4>
                  </div>
                  <div className="p-4 overflow-hidden w-full max-w-full">
                    <div className="space-y-3 max-h-[300px] overflow-y-auto overflow-x-hidden">
                      {noteEvents.map((event: { 
                        id: string; 
                        action: string; 
                        performedByName: string; 
                        performedByRole: string;
                        targetUserName: string | null;
                        reason: string | null;
                        previousValue: string | null;
                        newValue: string | null;
                        createdAt: string;
                        ipAddress: string | null;
                      }) => (
                        <div 
                          key={event.id} 
                          className={`rounded-lg p-4 border overflow-hidden w-full max-w-full ${
                            event.action === "delete" 
                              ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" 
                              : event.action === "create"
                              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                              : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge 
                                className={`text-xs ${
                                  event.action === "delete" 
                                    ? "bg-red-500 text-white" 
                                    : event.action === "create"
                                    ? "bg-green-500 text-white"
                                    : "bg-blue-500 text-white"
                                }`}
                              >
                                {event.action === "delete" ? "EXCLUÍDO" : event.action === "create" ? "CRIADO" : "ATUALIZADO"}
                              </Badge>
                              <span className="text-sm font-medium text-foreground">{event.performedByName}</span>
                              <span className="text-xs text-muted-foreground">({event.performedByRole})</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.createdAt).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          
                          {event.action === "delete" && event.targetUserName && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Nota do usuário <strong>{event.targetUserName}</strong> foi excluída
                            </p>
                          )}
                          
                          {event.reason && (
                            <p className="text-xs text-muted-foreground mb-2 break-all">
                              <span className="font-medium">Motivo:</span> {event.reason}
                            </p>
                          )}
                          
                          {event.previousValue && (
                            <div className="text-xs bg-background/50 rounded p-2 mt-2 overflow-hidden w-full max-w-full">
                              <span className="font-medium text-muted-foreground">Conteúdo anterior:</span>
                              <p className="text-foreground mt-1 break-all whitespace-pre-wrap overflow-hidden">{event.previousValue}</p>
                            </div>
                          )}
                          
                          {event.ipAddress && (
                            <p className="text-xs text-muted-foreground mt-2">
                              IP: {event.ipAddress}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4 overflow-hidden">
              <h3 className="font-semibold text-sm mb-3">Dados Clínicos</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="min-w-0">
                  <span className="text-muted-foreground">Braden:</span>{" "}
                  <span className={`font-medium ${parseInt(patient.braden || "0") < 12 ? "text-red-600" : parseInt(patient.braden || "0") < 15 ? "text-yellow-600" : ""}`}>
                    {patient.braden || "-"}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Mobilidade:</span>{" "}
                  <span className="font-medium break-words">{patient.mobilidade || "-"}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Dieta:</span>{" "}
                  <span className="font-medium break-words">{patient.dieta || "-"}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Eliminações:</span>{" "}
                  <span className="font-medium break-words">{patient.eliminacoes || "-"}</span>
                </div>
                <div className="col-span-2 min-w-0">
                  <span className="text-muted-foreground">Dispositivos:</span>{" "}
                  <span className="font-medium break-words">{patient.dispositivos || "-"}</span>
                </div>
                <div className="col-span-2 min-w-0">
                  <span className="text-muted-foreground">ATB:</span>{" "}
                  <span className="font-medium break-words">{patient.atb || "-"}</span>
                </div>
                <div className="col-span-2 min-w-0">
                  <span className="text-muted-foreground">Aporte/Saturação:</span>{" "}
                  <span className="font-medium break-words">{patient.aporteSaturacao || "-"}</span>
                </div>
                <div className="col-span-2 min-w-0">
                  <span className="text-muted-foreground">Curativos:</span>{" "}
                  <span className="font-medium break-words">{patient.curativos || "-"}</span>
                </div>
                <div className="col-span-2 min-w-0">
                  <span className="text-muted-foreground">Observações:</span>{" "}
                  <span className="font-medium break-words">{patient.observacoes || "-"}</span>
                </div>
              </div>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir Nota do Paciente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Você está prestes a excluir a nota do paciente <strong>{patient.nome}</strong> (Leito {patient.leito}).
              </p>
              <p className="text-sm">
                Esta ação irá:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Remover a nota atual do paciente</li>
                <li>Registrar a exclusão na trilha de auditoria</li>
                <li>Notificar o autor original da nota (se diferente de você)</li>
              </ul>
              <div className="pt-2">
                <label className="text-sm font-medium text-foreground">Motivo da exclusão (opcional):</label>
                <Textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Ex: Informação desatualizada, nota duplicada..."
                  className="mt-2"
                  rows={2}
                  data-testid="textarea-delete-reason"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={() => { setShowDeleteConfirm(false); setDeleteReason(""); }}
            data-testid="button-cancel-delete"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteNotes}
            disabled={deleteNotesMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-delete"
          >
            {deleteNotesMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Confirmar Exclusão
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
