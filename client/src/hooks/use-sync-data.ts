/**
 * Hook unificado para sincronização de dados
 * Consolida useAutoSync e useSyncPatient em uma única abstração
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SyncStatus, SyncOptions } from "@/types";

type SyncScope = "all" | "single" | "multiple" | "custom";

interface UseSyncDataOptions {
  /**
   * Endpoint da sincronização
   */
  endpoint: string;

  /**
   * Escopo da sincronização: all (todas unidades), single (um item), multiple (vários itens)
   */
  scope?: SyncScope;

  /**
   * Habilitar sincronização automática periódica
   */
  autoSync?: boolean;

  /**
   * Intervalo de sincronização automática em milissegundos (padrão: 15 minutos)
   */
  syncInterval?: number;

  /**
   * Query keys para invalidar após sucesso
   */
  invalidateQueries?: string[];

  /**
   * Callback customizado após sucesso
   */
  onSuccess?: (data: any) => void;

  /**
   * Callback customizado após erro
   */
  onError?: (error: Error) => void;

  /**
   * Mensagens customizadas
   */
  messages?: {
    success?: string;
    error?: string;
  };

  /**
   * Desabilitar toasts (útil quando há UI customizada)
   */
  disableToasts?: boolean;

  /**
   * Executar sincronização inicial ao montar
   */
  runOnMount?: boolean;
}

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  totalImported: number;
  totalErrors: number;
  errorMessage?: string;
}

/**
 * Hook unificado para sincronização de dados
 *
 * @example
 * // Sincronização automática de todas as unidades
 * const { isSyncing, triggerSync, lastSyncTimeAgo } = useSyncData({
 *   endpoint: "/api/sync/evolucoes",
 *   scope: "all",
 *   autoSync: true,
 *   syncInterval: 900000, // 15 minutos
 * });
 *
 * @example
 * // Sincronização manual de um paciente
 * const { syncSingle } = useSyncData({
 *   endpoint: "/api/sync/patient",
 *   scope: "single",
 *   messages: {
 *     success: "Paciente sincronizado com sucesso",
 *   },
 * });
 * // Uso: syncSingle.mutate("123")
 *
 * @example
 * // Sincronização de múltiplos pacientes
 * const { syncMultiple } = useSyncData({
 *   endpoint: "/api/sync/patients",
 *   scope: "multiple",
 * });
 * // Uso: syncMultiple.mutate(["123", "456", "789"])
 */
export function useSyncData({
  endpoint,
  scope = "all",
  autoSync = false,
  syncInterval = 900000, // 15 minutos padrão
  invalidateQueries = ["/api/patients"],
  onSuccess: customOnSuccess,
  onError: customOnError,
  messages,
  disableToasts = false,
  runOnMount = false,
}: UseSyncDataOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncTime: null,
    syncStatus: "idle",
    totalImported: 0,
    totalErrors: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialSyncDoneRef = useRef(false);
  const isSyncingRef = useRef(false);

  /**
   * Executa a sincronização com opções configuráveis
   */
  const performSync = useCallback(
    async (options?: SyncOptions) => {
      // Prevenir sincronizações concorrentes
      if (isSyncingRef.current) {
        console.log("[useSyncData] Sync já em progresso, pulando");
        return;
      }

      isSyncingRef.current = true;
      setSyncState((prev) => ({ ...prev, isSyncing: true, syncStatus: "syncing" }));

      try {
        console.log(`[useSyncData] Iniciando sincronização: ${endpoint}`);

        const response = await apiRequest("POST", endpoint, options || {});

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Invalidar queries relacionadas
        await Promise.all(
          invalidateQueries.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey: [queryKey] })
          )
        );

        // Extrair estatísticas da resposta
        const stats = data.stats || data;
        const imported = stats.imported || stats.total || 0;
        const updated = stats.updated || 0;
        const errors = stats.errors || 0;

        console.log(
          `[useSyncData] ✓ Concluído: ${imported} importados, ${updated} atualizados, ${errors} erros`
        );

        setSyncState({
          isSyncing: false,
          syncStatus: "success",
          lastSyncTime: new Date(),
          totalImported: imported + updated,
          totalErrors: errors,
        });

        // Toast de sucesso
        if (!disableToasts) {
          const defaultMessage =
            imported + updated > 0
              ? `${imported + updated} registro(s) sincronizado(s)`
              : "Sincronização concluída";

          toast({
            title: "Sucesso",
            description: messages?.success || defaultMessage,
          });
        }

        // Callback customizado
        if (customOnSuccess) {
          customOnSuccess(data);
        }

        // Auto-esconder status de sucesso após 5 segundos
        setTimeout(() => {
          setSyncState((prev) => ({ ...prev, syncStatus: "idle" }));
        }, 5000);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido na sincronização";

        console.error("[useSyncData] Erro:", errorMessage);

        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          syncStatus: "error",
          totalErrors: prev.totalErrors + 1,
          errorMessage,
        }));

        // Toast de erro
        if (!disableToasts) {
          toast({
            title: "Erro na sincronização",
            description: messages?.error || errorMessage,
            variant: "destructive",
          });
        }

        // Callback customizado
        if (customOnError && error instanceof Error) {
          customOnError(error);
        }

        // Auto-esconder status de erro após 5 segundos
        setTimeout(() => {
          setSyncState((prev) => ({ ...prev, syncStatus: "idle" }));
        }, 5000);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [endpoint, invalidateQueries, customOnSuccess, customOnError, messages, disableToasts, toast, queryClient]
  );

  /**
   * Trigger manual de sincronização
   */
  const triggerSync = useCallback(
    async (options?: SyncOptions) => {
      await performSync(options);
    },
    [performSync]
  );

  /**
   * Mutação para sincronizar um único item (scope: single)
   */
  const syncSingle = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `${endpoint}/${id}`);
      return response.json();
    },
    onSuccess: async (data) => {
      await Promise.all(
        invalidateQueries.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        )
      );

      if (!disableToasts) {
        toast({
          title: "Sucesso",
          description: messages?.success || "Item sincronizado com sucesso",
        });
      }

      if (customOnSuccess) {
        customOnSuccess(data);
      }
    },
    onError: (error) => {
      if (!disableToasts) {
        toast({
          title: "Erro",
          description:
            messages?.error ||
            (error instanceof Error ? error.message : "Falha ao sincronizar"),
          variant: "destructive",
        });
      }

      if (customOnError && error instanceof Error) {
        customOnError(error);
      }
    },
  });

  /**
   * Mutação para sincronizar múltiplos itens (scope: multiple)
   */
  const syncMultiple = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiRequest("POST", endpoint, { ids });
      return response.json();
    },
    onSuccess: async (data) => {
      await Promise.all(
        invalidateQueries.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        )
      );

      const count = Array.isArray(data) ? data.length : data.count || 0;

      if (!disableToasts) {
        toast({
          title: "Sucesso",
          description: messages?.success || `${count} item(ns) sincronizado(s)`,
        });
      }

      if (customOnSuccess) {
        customOnSuccess(data);
      }
    },
    onError: (error) => {
      if (!disableToasts) {
        toast({
          title: "Erro",
          description:
            messages?.error ||
            (error instanceof Error ? error.message : "Falha ao sincronizar"),
          variant: "destructive",
        });
      }

      if (customOnError && error instanceof Error) {
        customOnError(error);
      }
    },
  });

  /**
   * Setup de sincronização automática periódica
   */
  useEffect(() => {
    if (!autoSync) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      initialSyncDoneRef.current = false;
      return;
    }

    // Sincronização inicial ao montar (se habilitado)
    if (runOnMount && !initialSyncDoneRef.current) {
      initialSyncDoneRef.current = true;
      console.log("[useSyncData] Executando sincronização inicial");
      performSync();
    }

    // Setup de intervalo periódico
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        console.log(
          `[useSyncData] Sincronização periódica (a cada ${syncInterval / 1000 / 60} minutos)`
        );
        performSync();
      }, syncInterval);

      console.log(
        `[useSyncData] Intervalo configurado: sync a cada ${syncInterval / 1000 / 60} minutos`
      );
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoSync, syncInterval, runOnMount, performSync]);

  /**
   * Calcula tempo decorrido desde última sincronização
   */
  const getTimeAgo = useCallback((date: Date): string => {
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (secondsAgo < 60) return `há ${secondsAgo}s`;
    if (secondsAgo < 3600) return `há ${Math.floor(secondsAgo / 60)}m`;
    if (secondsAgo < 86400) return `há ${Math.floor(secondsAgo / 3600)}h`;
    return `há ${Math.floor(secondsAgo / 86400)}d`;
  }, []);

  return {
    // Estado
    ...syncState,
    lastSyncTimeAgo: syncState.lastSyncTime ? getTimeAgo(syncState.lastSyncTime) : "Nunca",

    // Métodos
    triggerSync,
    syncSingle: scope === "single" ? syncSingle : undefined,
    syncMultiple: scope === "multiple" ? syncMultiple : undefined,
  };
}
