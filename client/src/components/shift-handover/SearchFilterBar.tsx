import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";

interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterCritical: boolean;
  criticalCount: number;
  onClearCriticalFilter: () => void;
  filterPending: boolean;
  pendingCount: number;
  onClearPendingFilter: () => void;
  filterEspecialidade: string;
  especialidades: string[];
  onEspecialidadeChange: (value: string) => void;
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
  filterEspecialidade,
  especialidades,
  onEspecialidadeChange,
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
        
        <div className="flex items-center gap-2">
          <SelectPrimitive.Root value={filterEspecialidade} onValueChange={onEspecialidadeChange}>
            <SelectPrimitive.Trigger
              className="flex h-9 min-w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="select-especialidade-filter"
            >
              <SelectPrimitive.Value placeholder="Filtrar por Especialidade..." />
              <SelectPrimitive.Icon>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>
            <SelectPrimitive.Portal>
              <SelectPrimitive.Content className="relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                <SelectPrimitive.Viewport className="p-1">
                  <SelectPrimitive.Item 
                    value="__all__" 
                    className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <SelectPrimitive.ItemText>Todas as Especialidades</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                  {especialidades.map((esp) => (
                    <SelectPrimitive.Item
                      key={esp}
                      value={esp}
                      className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    >
                      <SelectPrimitive.ItemText>{esp}</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  ))}
                </SelectPrimitive.Viewport>
              </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
          </SelectPrimitive.Root>
          
          {filterEspecialidade && filterEspecialidade !== "__all__" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEspecialidadeChange("")}
              className="h-9 w-9"
              data-testid="button-clear-especialidade-filter"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
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
