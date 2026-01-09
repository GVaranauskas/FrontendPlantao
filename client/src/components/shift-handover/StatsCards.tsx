import { Card } from "@/components/ui/card";
import { Filter } from "lucide-react";
import type { PatientStats } from "./types";

interface StatsCardsProps {
  stats: PatientStats;
  filterCritical: boolean;
  onFilterCriticalToggle: () => void;
}

export function StatsCards({ stats, filterCritical, onFilterCriticalToggle }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <Card className="p-4 text-center border-t-4 border-t-chart-2 bg-gradient-to-br from-card to-chart-2/5">
        <div className="text-3xl font-bold text-chart-2 mb-1" data-testid="stat-complete">
          {stats.complete}
        </div>
        <div className="text-sm font-semibold text-muted-foreground">Completos</div>
      </Card>
      <Card className="p-4 text-center border-t-4 border-t-chart-3 bg-gradient-to-br from-card to-chart-3/5">
        <div className="text-3xl font-bold text-chart-3 mb-1" data-testid="stat-pending">
          {stats.pending}
        </div>
        <div className="text-sm font-semibold text-muted-foreground">Pendentes</div>
      </Card>
      <Card className="p-4 text-center border-t-4 border-t-chart-4 bg-gradient-to-br from-card to-chart-4/5 opacity-50">
        <div className="text-3xl font-bold text-chart-4 mb-1" data-testid="stat-alert">
          0
        </div>
        <div className="text-sm font-semibold text-muted-foreground">Com Alertas</div>
      </Card>
      <Card 
        className={`p-4 text-center border-t-4 border-t-destructive bg-gradient-to-br from-card to-destructive/5 cursor-pointer transition-all duration-200 ${
          filterCritical 
            ? "ring-2 ring-destructive ring-offset-2 ring-offset-background shadow-lg scale-[1.02]" 
            : "hover:shadow-md hover:scale-[1.01]"
        } ${stats.critical === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => stats.critical > 0 && onFilterCriticalToggle()}
        data-testid="card-filter-critical"
      >
        <div className="text-3xl font-bold text-destructive mb-1" data-testid="stat-critical">
          {stats.critical}
        </div>
        <div className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1">
          {filterCritical && <Filter className="w-3 h-3" />}
          Críticos
        </div>
      </Card>
      <Card className="p-4 text-center border-t-4 border-t-primary bg-gradient-to-br from-card to-primary/5">
        <div className="text-3xl font-bold text-primary mb-1" data-testid="stat-total">
          {stats.total}
        </div>
        <div className="text-sm font-semibold text-muted-foreground">Total</div>
      </Card>
    </div>
  );
}
