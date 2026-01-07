/**
 * Hook para busca e filtragem com memoização
 * Evita re-cálculos desnecessários ao filtrar arrays grandes
 */

import { useState, useMemo, useCallback } from "react";

type SortDirection = "asc" | "desc";

interface UseSearchOptions<T> {
  /**
   * Itens a serem filtrados
   */
  items: T[];

  /**
   * Campos nos quais buscar (suporta nested objects com dot notation)
   * Ex: ['nome', 'leito', 'diagnostico']
   */
  searchFields: (keyof T | string)[];

  /**
   * Termo de busca inicial
   */
  initialSearchTerm?: string;

  /**
   * Case sensitive (padrão: false)
   */
  caseSensitive?: boolean;

  /**
   * Debounce delay em ms (padrão: 0 - sem debounce)
   */
  debounceMs?: number;

  /**
   * Função de transformação customizada para busca
   * Útil para normalizar texto (remover acentos, etc)
   */
  transformFn?: (value: string) => string;
}

interface UseSearchWithSortOptions<T> extends UseSearchOptions<T> {
  /**
   * Campo inicial para ordenação
   */
  initialSortBy?: keyof T | string;

  /**
   * Direção inicial de ordenação
   */
  initialSortDirection?: SortDirection;

  /**
   * Função customizada de comparação para ordenação
   */
  compareFn?: (a: T, b: T, sortBy: keyof T | string) => number;
}

/**
 * Obtém valor de um objeto usando dot notation
 * Ex: getNestedValue({ user: { name: 'John' } }, 'user.name') => 'John'
 */
function getNestedValue<T>(obj: T, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj as any);
}

/**
 * Normaliza texto removendo acentos e caracteres especiais
 */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Hook básico de busca com memoização
 *
 * @example
 * const { filtered, searchTerm, setSearchTerm, resultCount } = useSearch({
 *   items: patients,
 *   searchFields: ['nome', 'leito', 'diagnostico'],
 * });
 *
 * @example
 * // Com transformação customizada
 * const { filtered } = useSearch({
 *   items: patients,
 *   searchFields: ['nome'],
 *   transformFn: normalizeText, // Remove acentos
 * });
 */
export function useSearch<T>({
  items,
  searchFields,
  initialSearchTerm = "",
  caseSensitive = false,
  transformFn,
}: UseSearchOptions<T>) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) {
      return items;
    }

    const term = transformFn
      ? transformFn(searchTerm)
      : caseSensitive
      ? searchTerm
      : searchTerm.toLowerCase();

    return items.filter((item) => {
      return searchFields.some((field) => {
        const value = getNestedValue(item, field as string);
        if (value === null || value === undefined) return false;

        const stringValue = String(value);
        const searchValue = transformFn
          ? transformFn(stringValue)
          : caseSensitive
          ? stringValue
          : stringValue.toLowerCase();

        return searchValue.includes(term);
      });
    });
  }, [items, searchTerm, searchFields, caseSensitive, transformFn]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  return {
    filtered,
    searchTerm,
    setSearchTerm,
    clearSearch,
    resultCount: filtered.length,
    totalCount: items.length,
    hasResults: filtered.length > 0,
    isFiltered: searchTerm.trim().length > 0,
  };
}

/**
 * Hook de busca com ordenação e memoização
 *
 * @example
 * const {
 *   filtered,
 *   searchTerm,
 *   setSearchTerm,
 *   sortBy,
 *   sortDirection,
 *   setSortBy,
 *   toggleSort
 * } = useSearchWithSort({
 *   items: patients,
 *   searchFields: ['nome', 'leito'],
 *   initialSortBy: 'leito',
 *   initialSortDirection: 'asc',
 * });
 */
export function useSearchWithSort<T>({
  items,
  searchFields,
  initialSearchTerm = "",
  caseSensitive = false,
  transformFn,
  initialSortBy,
  initialSortDirection = "asc",
  compareFn,
}: UseSearchWithSortOptions<T>) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [sortBy, setSortBy] = useState<keyof T | string | undefined>(initialSortBy);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  const filteredAndSorted = useMemo(() => {
    // Primeiro filtrar
    let result = items;

    if (searchTerm.trim()) {
      const term = transformFn
        ? transformFn(searchTerm)
        : caseSensitive
        ? searchTerm
        : searchTerm.toLowerCase();

      result = items.filter((item) => {
        return searchFields.some((field) => {
          const value = getNestedValue(item, field as string);
          if (value === null || value === undefined) return false;

          const stringValue = String(value);
          const searchValue = transformFn
            ? transformFn(stringValue)
            : caseSensitive
            ? stringValue
            : stringValue.toLowerCase();

          return searchValue.includes(term);
        });
      });
    }

    // Depois ordenar
    if (sortBy) {
      result = [...result].sort((a, b) => {
        if (compareFn) {
          return sortDirection === "asc"
            ? compareFn(a, b, sortBy)
            : compareFn(b, a, sortBy);
        }

        const aValue = getNestedValue(a, sortBy as string);
        const bValue = getNestedValue(b, sortBy as string);

        // Tratar valores nulos/undefined
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // Comparação numérica
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }

        // Comparação de strings
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (sortDirection === "asc") {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return result;
  }, [items, searchTerm, searchFields, caseSensitive, transformFn, sortBy, sortDirection, compareFn]);

  const toggleSort = useCallback((field: keyof T | string) => {
    setSortBy((prev) => {
      if (prev === field) {
        // Se já está ordenando por este campo, inverte a direção
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return field;
      } else {
        // Se é um novo campo, começa com ascendente
        setSortDirection("asc");
        return field;
      }
    });
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  const resetSort = useCallback(() => {
    setSortBy(initialSortBy);
    setSortDirection(initialSortDirection);
  }, [initialSortBy, initialSortDirection]);

  return {
    // Dados filtrados e ordenados
    filtered: filteredAndSorted,

    // Busca
    searchTerm,
    setSearchTerm,
    clearSearch,

    // Ordenação
    sortBy,
    sortDirection,
    setSortBy,
    setSortDirection,
    toggleSort,
    resetSort,

    // Estatísticas
    resultCount: filteredAndSorted.length,
    totalCount: items.length,
    hasResults: filteredAndSorted.length > 0,
    isFiltered: searchTerm.trim().length > 0,
    isSorted: sortBy !== undefined,
  };
}

/**
 * Hook de busca normalizada (remove acentos automaticamente)
 * Útil para buscar em textos em português
 *
 * @example
 * const { filtered } = useNormalizedSearch({
 *   items: patients,
 *   searchFields: ['nome', 'diagnostico'],
 * });
 * // Buscar "jose" vai encontrar "José"
 */
export function useNormalizedSearch<T>(options: UseSearchOptions<T>) {
  return useSearch({
    ...options,
    transformFn: normalizeText,
  });
}

/**
 * Hook de busca com múltiplos filtros
 * Permite combinar busca por texto com filtros por categoria
 *
 * @example
 * const { filtered } = useMultiFilter({
 *   items: patients,
 *   searchFields: ['nome', 'leito'],
 *   filters: {
 *     status: 'ativo',
 *     nivel_alerta: 'VERMELHO',
 *   },
 * });
 */
export function useMultiFilter<T>({
  items,
  searchFields,
  initialSearchTerm = "",
  filters,
}: UseSearchOptions<T> & { filters?: Partial<Record<keyof T, any>> }) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [activeFilters, setActiveFilters] = useState<Partial<Record<keyof T, any>>>(
    filters || {}
  );

  const filtered = useMemo(() => {
    let result = items;

    // Aplicar busca por texto
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((item) => {
        return searchFields.some((field) => {
          const value = getNestedValue(item, field as string);
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(term);
        });
      });
    }

    // Aplicar filtros por campo
    Object.entries(activeFilters).forEach(([field, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        result = result.filter((item) => {
          const itemValue = getNestedValue(item, field);
          return itemValue === value;
        });
      }
    });

    return result;
  }, [items, searchTerm, searchFields, activeFilters]);

  const setFilter = useCallback((field: keyof T, value: any) => {
    setActiveFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const clearFilter = useCallback((field: keyof T) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
    setSearchTerm("");
  }, []);

  return {
    filtered,
    searchTerm,
    setSearchTerm,
    activeFilters,
    setFilter,
    clearFilter,
    clearAllFilters,
    resultCount: filtered.length,
    totalCount: items.length,
    hasActiveFilters: Object.keys(activeFilters).length > 0 || searchTerm.trim().length > 0,
  };
}
