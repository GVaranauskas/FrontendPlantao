import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterCritical: boolean;
  criticalCount: number;
  onClearCriticalFilter: () => void;
  filterPending: boolean;
  pendingCount: number;
  onClearPendingFilter: () => void;
}

export function SearchFilterBar({
  searchTerm,
  onSearchChange,
  filterCritical,
  criticalCount,
  onClearCriticalFilter,
  filterPending,
  pendingCount,
  onClearPendingFilter,
}: SearchFilterBarProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
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
            onClick={onClearCriticalFilter}
            className="flex items-center gap-2 whitespace-nowrap"
            data-testid="button-clear-critical-filter"
          >
            <Filter className="w-4 h-4" />
            Críticos ({criticalCount})
            <span className="ml-1 opacity-70">×</span>
          </Button>
        )}
        {filterPending && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearPendingFilter}
            className="flex items-center gap-2 whitespace-nowrap"
            data-testid="button-clear-pending-filter"
          >
            <Filter className="w-4 h-4" />
            Pendentes ({pendingCount})
            <span className="ml-1 opacity-70">×</span>
          </Button>
        )}
      </div>
    </div>
  );
}
