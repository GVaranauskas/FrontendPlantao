import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Activity, CheckCircle } from "lucide-react";
import type { Patient } from "@shared/schema";
import type { ClinicalInsights } from "./types";

interface PatientTableProps {
  patients: Patient[];
  onPatientClick: (patient: Patient) => void;
}

export function PatientTable({ patients, onPatientClick }: PatientTableProps) {
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
