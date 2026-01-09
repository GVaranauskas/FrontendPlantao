import { useState, useMemo } from "react";

interface UseSearchFilterOptions<T> {
  data: T[] | undefined;
  searchKeys: (keyof T)[];
}

export function useSearchFilter<T>({ data, searchKeys }: UseSearchFilterOptions<T>) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm.trim()) return data;

    const lowerSearch = searchTerm.toLowerCase();
    return data.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        if (typeof value === "string") {
          return value.toLowerCase().includes(lowerSearch);
        }
        if (typeof value === "number") {
          return value.toString().includes(lowerSearch);
        }
        return false;
      })
    );
  }, [data, searchTerm, searchKeys]);

  return {
    searchTerm,
    setSearchTerm,
    filteredData,
  };
}
