import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface LevelClassificationProps {
  vermelho: number;
  amarelo: number;
  verde: number;
  total: number;
}

export function LevelClassification({ vermelho, amarelo, verde, total }: LevelClassificationProps) {
  return (
    <Card className="p-4" data-testid="card-level-classification">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Classificação por Nível
      </h3>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-red-500/20 rounded-lg p-2">
          <div className="text-xl font-bold text-red-500" data-testid="text-critical-count">{vermelho}</div>
          <div className="text-[10px] text-muted-foreground">Críticos</div>
        </div>
        <div className="bg-yellow-500/20 rounded-lg p-2">
          <div className="text-xl font-bold text-yellow-600" data-testid="text-alert-count">{amarelo}</div>
          <div className="text-[10px] text-muted-foreground">Alertas</div>
        </div>
        <div className="bg-green-500/20 rounded-lg p-2">
          <div className="text-xl font-bold text-green-500" data-testid="text-ok-count">{verde}</div>
          <div className="text-[10px] text-muted-foreground">OK</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="text-xl font-bold" data-testid="text-total-count">{total}</div>
          <div className="text-[10px] text-muted-foreground">Total</div>
        </div>
      </div>
    </Card>
  );
}
