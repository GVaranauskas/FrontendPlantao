import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Filter } from "lucide-react";

interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterCritical: boolean;
  criticalCount: number;
  onClearFilter: () => void;
}

export function SearchFilterBar({
  searchTerm,
  onSearchChange,
  filterCritical,
  criticalCount,
  onClearFilter,
}: SearchFilterBarProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por paciente ou leito..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        {filterCritical && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onClearFilter}
            className="flex items-center gap-2 whitespace-nowrap"
            data-testid="button-clear-filter"
          >
            <Filter className="w-4 h-4" />
            Críticos ({criticalCount})
            <span className="ml-1 opacity-70">×</span>
          </Button>
        )}
      </div>
      <Card className="p-3 bg-muted/30">
        <div className="flex items-center gap-6 text-xs flex-wrap">
          <div className="font-semibold text-muted-foreground">Legenda - Mobilidade:</div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">A</Badge>
            <span className="text-muted-foreground">Acamado</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">D</Badge>
            <span className="text-muted-foreground">Deambula</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">DA</Badge>
            <span className="text-muted-foreground">Deambula Com Auxílio</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
