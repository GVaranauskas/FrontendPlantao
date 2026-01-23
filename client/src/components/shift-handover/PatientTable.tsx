import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Activity, CheckCircle, Edit2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAccessToken } from "@/lib/auth-token";
import type { Patient } from "@shared/schema";
import type { ClinicalInsights } from "./types";

interface PatientTableProps {
  patients: Patient[];
  onPatientClick: (patient: Patient) => void;
}

function EditableNotesCell({ patientId, currentNotes, onSave, isUpdating }: {
  patientId: string;
  currentNotes: string | null;
  onSave: (patientId: string, notes: string) => void;
  isUpdating: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [noteValue, setNoteValue] = useState(currentNotes || "");
  const maxLength = 200;

  const handleSave = () => {
    onSave(patientId, noteValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNoteValue(currentNotes || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1 p-1" onClick={(e) => e.stopPropagation()}>
        <textarea
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value.slice(0, maxLength))}
          className="w-full min-h-[60px] text-xs border border-border rounded p-2 focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
          placeholder="Adicione notas sobre o paciente..."
          maxLength={maxLength}
          disabled={isUpdating}
          autoFocus
          data-testid={`textarea-notes-${patientId}`}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{noteValue.length}/{maxLength}</span>
          <div className="flex gap-1">
            <button 
              onClick={handleSave} 
              disabled={isUpdating} 
              className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded disabled:opacity-50" 
              title="Salvar"
              data-testid={`button-save-notes-${patientId}`}
            >
              <Save className="h-4 w-4" />
            </button>
            <button 
              onClick={handleCancel} 
              disabled={isUpdating} 
              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-50" 
              title="Cancelar"
              data-testid={`button-cancel-notes-${patientId}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex items-start gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer group min-h-[40px]" 
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      data-testid={`cell-notes-${patientId}`}
    >
      <p className="text-xs text-foreground flex-1 whitespace-pre-wrap">
        {currentNotes || <span className="text-muted-foreground italic">Clique para adicionar notas...</span>}
      </p>
      <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5" />
    </div>
  );
}

export function PatientTable({ patients, onPatientClick }: PatientTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateNotesMutation = useMutation({
    mutationFn: async ({ patientId, notes }: { patientId: string; notes: string }) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/patients/${patientId}/notes`, {
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
      toast({ title: "Sucesso", description: "Notas atualizadas com sucesso" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const handleSaveNotes = (patientId: string, notes: string) => {
    updateNotesMutation.mutate({ patientId, notes });
  };

  const getRowBackground = (patient: Patient, idx: number) => {
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
    <Card className="overflow-hidden print:overflow-visible">
      <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto print:max-h-none print:overflow-visible">
        <table className="w-full text-[11px] border-collapse">
          <thead className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground sticky top-0 z-20">
            <tr>
              <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap sticky left-0 bg-primary z-30">LEITO</th>
              <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[60px]">ALERTA<br/>IA</th>
              <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[80px]">ENFERMARIA</th>
              <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[100px]">ESPECIALIDADE/<br/>RAMAL</th>
              <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[180px]">NOME/<br/>REGISTRO/<br/>IDADE</th>
              <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[90px]">DATA DE<br/>NASCIMENTO</th>
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
              <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[180px] bg-blue-600">NOTAS DO<br/>PACIENTE</th>
              <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[180px]">OBSERVAÇÕES/<br/>INTERCORRÊNCIAS</th>
              <th className="px-2 py-2 text-center font-semibold text-[10px] border border-primary/30 whitespace-nowrap min-w-[100px]">PREVISÃO<br/>DE ALTA</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient, idx) => (
              <tr 
                key={patient.id}
                className={`transition-colors cursor-pointer ${getRowBackground(patient, idx)}`}
                onClick={() => onPatientClick(patient)}
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
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-muted-foreground">REG: {patient.registro || "-"}</span>
                    {patient.idade !== null && patient.idade !== undefined && (
                      <span className="text-primary font-bold border-l pl-1.5">
                        {patient.idade} anos
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2 text-[10px] text-center border border-border">{patient.dataNascimento || "-"}</td>
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
                <td className="px-2 py-2 text-[10px] border border-border bg-blue-50/50 dark:bg-blue-900/20">
                  <EditableNotesCell 
                    patientId={patient.id} 
                    currentNotes={patient.notasPaciente ?? null} 
                    onSave={handleSaveNotes} 
                    isUpdating={updateNotesMutation.isPending} 
                  />
                </td>
                <td className="px-2 py-2 text-[10px] border border-border">{patient.observacoes || "-"}</td>
                <td className="px-2 py-2 text-[10px] border border-border">{patient.previsaoAlta || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
