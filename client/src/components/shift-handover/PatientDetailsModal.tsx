import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain, AlertTriangle, Activity, CheckCircle, Loader2, Edit2, Save, X, Clock, User, History
} from "lucide-react";
import type { Patient } from "@shared/schema";
import type { ClinicalInsights } from "./types";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

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

  // Query para buscar histórico de notas
  const { data: notesHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["patient-notes-history", patient?.id],
    queryFn: async () => {
      if (!patient?.id) return [];
      const response = await fetch(`/api/patients/${patient.id}/notes-history`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao buscar histórico");
      const result = await response.json();
      return result.data;
    },
    enabled: open && !!patient?.id,
  });

  // Mutation para atualizar notas
  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!patient?.id) throw new Error("Paciente não encontrado");
      const response = await fetch(`/api/patients/${patient.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
      toast({ title: "✅ Sucesso", description: "Notas atualizadas com sucesso" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "❌ Erro", description: error.message });
    },
  });

  const handleSaveNotes = () => {
    if (notesValue.length > maxLength) {
      toast({
        variant: "destructive",
        title: "❌ Erro",
        description: `As notas não podem exceder ${maxLength} caracteres`,
      });
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

            {/* ========================================== */}
            {/* SEÇÃO DE NOTAS DO PACIENTE */}
            {/* ========================================== */}
            <Card className="p-4 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                  Notas do Paciente
                </h3>
              </div>

              {/* Campo de edição/visualização */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm mb-4">
                {isEditingNotes ? (
                  // MODO DE EDIÇÃO
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Informações não clínicas relevantes sobre o paciente
                      </label>
                      <textarea
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value.slice(0, maxLength))}
                        className="w-full min-h-[100px] text-sm border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Familiar solicitou informações, paciente preferiu leito próximo à janela..."
                        maxLength={maxLength}
                        disabled={updateNotesMutation.isPending}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-medium ${notesValue.length > maxLength * 0.9 ? 'text-red-600' : 'text-gray-500'}`}>
                          {notesValue.length}/{maxLength} caracteres
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveNotes}
                            disabled={updateNotesMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            {updateNotesMutation.isPending ? "Salvando..." : "Salvar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={updateNotesMutation.isPending}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // MODO DE VISUALIZAÇÃO
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {patient.notasPaciente ? (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {patient.notasPaciente}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 italic text-center py-2">
                            Nenhuma nota registrada para este paciente
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsEditingNotes(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>

                    {/* Informações de quem atualizou */}
                    {patient.notasUpdatedAt && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Atualizado {formatDistanceToNow(new Date(patient.notasUpdatedAt), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Histórico de alterações */}
              {notesHistory && notesHistory.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 rounded-t-lg">
                    <h4 className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                      <History className="h-3 w-3" />
                      Histórico de Alterações ({notesHistory.length})
                    </h4>
                  </div>
                  <div className="p-3">
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {isLoadingHistory ? (
                        <p className="text-xs text-gray-500 text-center py-2">Carregando...</p>
                      ) : (
                        notesHistory.map((entry: any) => (
                          <div key={entry.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs">
                            {/* Cabeçalho da entrada */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="flex items-center gap-1.5 text-gray-800 font-medium">
                                <User className="h-3 w-3 text-blue-600" />
                                {entry.alteradoPorNome}
                              </span>
                              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(entry.alteradoEm).toLocaleString("pt-BR")}
                              </span>
                            </div>

                            {/* Conteúdo das mudanças */}
                            <div className="space-y-1.5">
                              {/* Valor anterior */}
                              {entry.notaAnterior !== null && (
                                <div className="bg-red-50 border border-red-200 rounded p-2">
                                  <span className="text-red-700 font-semibold text-[10px] block mb-1">❌ Anterior:</span>
                                  <p className="text-gray-700 text-[11px] pl-2 border-l-2 border-red-300">
                                    {entry.notaAnterior || <span className="italic text-gray-500">(vazio)</span>}
                                  </p>
                                </div>
                              )}

                              {/* Valor novo */}
                              <div className="bg-green-50 border border-green-200 rounded p-2">
                                <span className="text-green-700 font-semibold text-[10px] block mb-1">
                                  ✅ {entry.notaAnterior === null ? 'Criado' : 'Novo'}:
                                </span>
                                <p className="text-gray-700 text-[11px] pl-2 border-l-2 border-green-300">
                                  {entry.notaNova || <span className="italic text-gray-500">(vazio)</span>}
                                </p>
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
