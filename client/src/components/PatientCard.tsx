import { memo, useCallback } from "react";
import type { Patient } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCcw, Eye, Brain, Loader2 } from "lucide-react";
import type { ClinicalInsights } from "@/types";

interface PatientCardProps {
  patient: Patient;
  onViewDetails: (patient: Patient) => void;
  onSync?: (patientId: string) => void;
  onAnalyze?: (patientId: string) => void;
  isSyncing?: boolean;
  isAnalyzing?: boolean;
}

function getAlertBadge(insights: ClinicalInsights | null) {
  if (!insights?.nivel_alerta) return null;
  
  const variants: Record<string, { variant: "destructive" | "default" | "secondary"; label: string }> = {
    VERMELHO: { variant: "destructive", label: "Crítico" },
    AMARELO: { variant: "default", label: "Alerta" },
    VERDE: { variant: "secondary", label: "Estável" },
  };
  
  const config = variants[insights.nivel_alerta];
  if (!config) return null;
  
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export const PatientCard = memo(function PatientCard({
  patient,
  onViewDetails,
  onSync,
  onAnalyze,
  isSyncing = false,
  isAnalyzing = false,
}: PatientCardProps) {
  const insights = patient.clinicalInsights as ClinicalInsights | null;
  
  const handleViewDetails = useCallback(() => {
    onViewDetails(patient);
  }, [onViewDetails, patient]);
  
  const handleSync = useCallback(() => {
    onSync?.(patient.id);
  }, [onSync, patient.id]);
  
  const handleAnalyze = useCallback(() => {
    onAnalyze?.(patient.id);
  }, [onAnalyze, patient.id]);

  return (
    <Card 
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleViewDetails}
      data-testid={`card-patient-${patient.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-sm">{patient.leito}</span>
            {getAlertBadge(insights)}
          </div>
          <p className="text-sm font-medium truncate" title={patient.nome}>
            {patient.nome}
          </p>
          <p className="text-xs text-muted-foreground">
            {patient.idade ? `${patient.idade} anos` : ""} 
            {patient.sexo ? ` - ${patient.sexo}` : ""}
          </p>
          {patient.diagnostico && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {patient.diagnostico}
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails();
            }}
            data-testid={`button-view-${patient.id}`}
            title="Ver detalhes"
          >
            <Eye className="w-4 h-4" />
          </Button>
          
          {onSync && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleSync();
              }}
              disabled={isSyncing}
              data-testid={`button-sync-${patient.id}`}
              title="Sincronizar"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4" />
              )}
            </Button>
          )}
          
          {onAnalyze && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleAnalyze();
              }}
              disabled={isAnalyzing}
              data-testid={`button-analyze-${patient.id}`}
              title="Analisar com IA"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}, (prevProps, nextProps) => {
  const p = prevProps.patient;
  const n = nextProps.patient;
  return (
    p.id === n.id &&
    p.clinicalInsightsUpdatedAt === n.clinicalInsightsUpdatedAt &&
    p.nome === n.nome &&
    p.leito === n.leito &&
    p.idade === n.idade &&
    p.sexo === n.sexo &&
    p.diagnostico === n.diagnostico &&
    p.status === n.status &&
    JSON.stringify(p.clinicalInsights) === JSON.stringify(n.clinicalInsights) &&
    prevProps.isSyncing === nextProps.isSyncing &&
    prevProps.isAnalyzing === nextProps.isAnalyzing
  );
});
