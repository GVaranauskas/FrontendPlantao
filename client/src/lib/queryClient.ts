import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAccessToken } from "./auth-token";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Tipos de cache para queries
 */
export type QueryCacheType = "static" | "dynamic" | "real-time";

/**
 * Retorna opções de query baseadas no tipo de cache desejado
 *
 * @param type - Tipo de cache:
 *   - "static": Dados que raramente mudam (templates, configurações) - 1 hora
 *   - "dynamic": Dados que mudam frequentemente mas não em tempo real (pacientes, histórico) - 30 segundos
 *   - "real-time": Dados que devem ser sempre atualizados (status de importação, contadores) - refetch automático
 *
 * @example
 * // Templates não mudam com frequência
 * const { data: templates } = useQuery({
 *   queryKey: ["/api/templates"],
 *   ...getQueryOptions("static"),
 * });
 *
 * @example
 * // Pacientes mudam, mas não precisam de atualização em tempo real
 * const { data: patients } = useQuery({
 *   queryKey: ["/api/patients"],
 *   ...getQueryOptions("dynamic"),
 * });
 *
 * @example
 * // Status de importação precisa ser atualizado constantemente
 * const { data: importStatus } = useQuery({
 *   queryKey: ["/api/import/status"],
 *   ...getQueryOptions("real-time"),
 * });
 */
export function getQueryOptions(type: QueryCacheType) {
  const baseOptions = {
    retry: 1,
    refetchOnWindowFocus: false,
  };

  switch (type) {
    case "static":
      // Dados estáticos: cache por 1 hora
      return {
        ...baseOptions,
        staleTime: 1000 * 60 * 60, // 1 hora
        refetchInterval: false,
        refetchOnWindowFocus: false,
      };

    case "dynamic":
      // Dados dinâmicos: cache por 30 segundos
      return {
        ...baseOptions,
        staleTime: 1000 * 30, // 30 segundos
        refetchInterval: false,
        refetchOnWindowFocus: true, // Refetch ao focar janela
      };

    case "real-time":
      // Dados em tempo real: sem cache, refetch a cada 5 segundos
      return {
        ...baseOptions,
        staleTime: 0,
        refetchInterval: 5000, // 5 segundos
        refetchOnWindowFocus: true,
      };

    default:
      return baseOptions;
  }
}

/**
 * Helper para invalidar múltiplas queries de uma vez
 *
 * @example
 * invalidateMultipleQueries(["/api/patients", "/api/alerts"]);
 */
export async function invalidateMultipleQueries(queryKeys: string[]) {
  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey: [queryKey] })
    )
  );
}

/**
 * Helper para prefetch de queries
 * Útil para carregar dados antes de navegação
 *
 * @example
 * // Ao passar o mouse sobre um link, prefetch dos dados
 * onMouseEnter={() => prefetchQuery("/api/patient/123")}
 */
export async function prefetchQuery<T = any>(
  queryKey: string,
  cacheType: QueryCacheType = "dynamic"
) {
  await queryClient.prefetchQuery({
    queryKey: [queryKey],
    ...getQueryOptions(cacheType),
  });
}

/**
 * Helper para limpar cache de queries antigas
 * Útil para liberar memória
 */
export function clearOldCache(olderThanMs: number = 1000 * 60 * 60) {
  queryClient.clear();
  console.log(`[QueryClient] Cache limpo (mais antigo que ${olderThanMs / 1000}s)`);
}
