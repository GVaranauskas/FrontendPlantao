import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, AlertTriangle, Activity, CheckCircle, Loader2, Edit2, Save, X, Clock, User, History
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
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
  const queryClient = useQueryClient();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(patient?.notasPaciente || "");
  const maxLength = 200;

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient-notes-history", patient?.id] });
      setIsEditingNotes(false);
      toast({ title: "Sucesso", description: "Notas atualizadas com sucesso" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Badge className="bg-primary text-primary-foreground px-3 py-1">
              Leito {patient.leito}
            </Badge>
            <span className="text-lg">{patient.nome}</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Informações do Paciente</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Registro:</span>{" "}
                  <span className="font-medium">{patient.registro || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Data Nascimento:</span>{" "}
                  <span className="font-medium">{patient.dataNascimento || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Idade:</span>{" "}
                  <span className="font-bold text-primary">
                    {patient.idade !== null && patient.idade !== undefined 
                      ? `${patient.idade} anos` 
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sexo:</span>{" "}
                  <span className="font-medium">{patient.sexo || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Data Internação:</span>{" "}
                  <span className="font-medium">{patient.dataInternacao || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Enfermaria:</span>{" "}
                  <span className="font-medium">{patient.dsEnfermaria || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Diagnóstico:</span>{" "}
                  <span className="font-medium">{patient.diagnostico || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Alergias:</span>{" "}
                  <span className="font-medium text-red-600">{patient.alergias || "Nenhuma informada"}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-primary/30">
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

            <Card className="p-4 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
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
                          <p className="text-sm text-foreground whitespace-pre-wrap">{patient.notasPaciente}</p>
                        </div>
                      ) : (
                        <div className="bg-background rounded-lg p-4 border border-dashed border-muted-foreground/30">
                          <p className="text-sm text-muted-foreground italic text-center">Nenhuma nota registrada</p>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => { setNotesValue(patient.notasPaciente || ""); setIsEditingNotes(true); }} 
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="button-modal-edit-notes"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
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
                          <div key={entry.id} className="bg-muted/50 rounded-lg p-4 border border-border">
                            <div className="flex items-center justify-between mb-3">
                              <span className="flex items-center gap-2 text-foreground font-medium text-sm">
                                <User className="h-4 w-4 text-blue-600" />
                                {entry.alteradoPorNome}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.alteradoEm).toLocaleString("pt-BR")}
                              </span>
                            </div>
                            <div className="space-y-2 text-xs">
                              {entry.notaAnterior !== null && (
                                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2">
                                  <span className="text-red-700 dark:text-red-400 font-semibold">Anterior:</span>
                                  <p className="text-foreground pl-2">{entry.notaAnterior || "(vazio)"}</p>
                                </div>
                              )}
                              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2">
                                <span className="text-green-700 dark:text-green-400 font-semibold">Novo:</span>
                                <p className="text-foreground pl-2">{entry.notaNova || "(vazio)"}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Dados Clínicos</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Braden:</span>{" "}
                  <span className={`font-medium ${parseInt(patient.braden || "0") < 12 ? "text-red-600" : parseInt(patient.braden || "0") < 15 ? "text-yellow-600" : ""}`}>
                    {patient.braden || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Mobilidade:</span>{" "}
                  <span className="font-medium">{patient.mobilidade || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Dieta:</span>{" "}
                  <span className="font-medium">{patient.dieta || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Eliminações:</span>{" "}
                  <span className="font-medium">{patient.eliminacoes || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Dispositivos:</span>{" "}
                  <span className="font-medium">{patient.dispositivos || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">ATB:</span>{" "}
                  <span className="font-medium">{patient.atb || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Aporte/Saturação:</span>{" "}
                  <span className="font-medium">{patient.aporteSaturacao || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Curativos:</span>{" "}
                  <span className="font-medium">{patient.curativos || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Observações:</span>{" "}
                  <span className="font-medium">{patient.observacoes || "-"}</span>
                </div>
              </div>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
