import { Card } from "@/components/ui/card";
import { TrendingUp, Users, Clock, FileText } from "lucide-react";
import type { IndicadoresPlantao } from "@/types";

interface ShiftIndicatorsProps {
  indicadores: IndicadoresPlantao;
}

export function ShiftIndicators({ indicadores }: ShiftIndicatorsProps) {
  return (
    <Card className="p-4" data-testid="card-shift-indicators">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Indicadores do Plantão
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
          <Users className="w-4 h-4 text-primary" />
          <div>
            <div className="text-lg font-bold" data-testid="text-total-patients">{indicadores.total_pacientes}</div>
            <div className="text-[10px] text-muted-foreground">Total Pacientes</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
          <Clock className="w-4 h-4 text-orange-500" />
          <div>
            <div className="text-lg font-bold" data-testid="text-avg-stay">{indicadores.media_dias_internacao}d</div>
            <div className="text-[10px] text-muted-foreground">Média Internação</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
          <FileText className="w-4 h-4 text-green-500" />
          <div>
            <div className="text-lg font-bold" data-testid="text-doc-completeness">{indicadores.taxa_completude_documentacao}%</div>
            <div className="text-[10px] text-muted-foreground">Completude Doc.</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="text-center p-2 bg-red-500/10 rounded-lg">
          <div className="text-sm font-bold text-red-500" data-testid="text-high-complexity">{indicadores.pacientes_alta_complexidade}</div>
          <div className="text-[9px] text-muted-foreground">Alta Complex.</div>
        </div>
        <div className="text-center p-2 bg-purple-500/10 rounded-lg">
          <div className="text-sm font-bold text-purple-500" data-testid="text-with-devices">{indicadores.pacientes_com_dispositivos}</div>
          <div className="text-[9px] text-muted-foreground">C/ Dispositivos</div>
        </div>
        <div className="text-center p-2 bg-orange-500/10 rounded-lg">
          <div className="text-sm font-bold text-orange-500" data-testid="text-on-atb">{indicadores.pacientes_com_atb}</div>
          <div className="text-[9px] text-muted-foreground">Em ATB</div>
        </div>
        <div className="text-center p-2 bg-blue-500/10 rounded-lg">
          <div className="text-sm font-bold text-blue-500" data-testid="text-bedridden">{indicadores.pacientes_acamados}</div>
          <div className="text-[9px] text-muted-foreground">Acamados</div>
        </div>
        <div className="text-center p-2 bg-yellow-500/10 rounded-lg">
          <div className="text-sm font-bold text-yellow-600" data-testid="text-fall-risk">{indicadores.pacientes_risco_queda_alto}</div>
          <div className="text-[9px] text-muted-foreground">Risco Queda</div>
        </div>
        <div className="text-center p-2 bg-pink-500/10 rounded-lg">
          <div className="text-sm font-bold text-pink-500" data-testid="text-pressure-injury">{indicadores.pacientes_lesao_pressao}</div>
          <div className="text-[9px] text-muted-foreground">Risco LPP</div>
        </div>
      </div>
    </Card>
  );
}
