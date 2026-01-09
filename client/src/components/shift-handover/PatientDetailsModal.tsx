import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, AlertTriangle, Activity, CheckCircle, Loader2 
} from "lucide-react";
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
