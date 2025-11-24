import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Enfermaria {
  codigo: string;
  nome: string;
}

interface AutoSyncState {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  totalImported: number;
  totalErrors: number;
}

interface UseAutoSyncProps {
  enabled?: boolean;
  syncInterval?: number; // milliseconds, default 300000 = 5 min
}

export function useAutoSync(props?: UseAutoSyncProps) {
  const { enabled = false, syncInterval = 300000 } = props || {};

  const [syncState, setSyncState] = useState<AutoSyncState>({
    isSyncing: false,
    lastSyncTime: null,
    syncStatus: "idle",
    totalImported: 0,
    totalErrors: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPageVisibleRef = useRef(true);

  // Fetch enfermarias list
  const { data: enfermarias } = useQuery<Enfermaria[]>({
    queryKey: ["/api/enfermarias"],
  });

  // Detect page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Function to sync all enfermarias sequentially
  const performAutoSync = async () => {
    if (!isPageVisibleRef.current || !enfermarias?.length) return;

    setSyncState(prev => ({ ...prev, isSyncing: true, syncStatus: "syncing" }));
    let totalImported = 0;
    let totalErrors = 0;

    try {
      // Process each enfermaria sequentially
      for (const enfermaria of enfermarias) {
        try {
          const res = await apiRequest("POST", "/api/import/evolucoes", {
            enfermaria: enfermaria.codigo,
          });
          const data = (await res.json()) as {
            success: boolean;
            stats: { total: number; importados: number; erros: number };
          };

          if (data.success) {
            totalImported += data.stats.importados;
            totalErrors += data.stats.erros;
          }
        } catch (error) {
          console.error(`[Auto-sync] Error syncing ${enfermaria.codigo}:`, error);
          totalErrors++;
        }
      }

      // Invalidate patient cache to refresh UI
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });

      // Log summary
      console.log(
        `[Auto-sync] Sync completed: ${totalImported} imported, ${totalErrors} errors from ${enfermarias.length} enfermarias`
      );

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncStatus: "success",
        lastSyncTime: new Date(),
        totalImported,
        totalErrors,
      }));

      // Auto-hide success message after 2 seconds
      const hideTimer = setTimeout(() => {
        setSyncState(prev => ({ ...prev, syncStatus: "idle" }));
      }, 2000);

      return () => clearTimeout(hideTimer);
    } catch (error) {
      console.error("[Auto-sync] Critical error:", error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncStatus: "error",
        totalErrors: totalErrors + 1,
      }));

      // Auto-hide error message after 3 seconds
      const hideTimer = setTimeout(() => {
        setSyncState(prev => ({ ...prev, syncStatus: "idle" }));
      }, 3000);

      return () => clearTimeout(hideTimer);
    }
  };

  // Manual sync trigger
  const triggerSync = async () => {
    await performAutoSync();
  };

  // Setup interval for periodic sync
  useEffect(() => {
    if (!enabled || !enfermarias?.length) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // First sync immediately on mount
    performAutoSync();

    // Setup periodic sync
    intervalRef.current = setInterval(() => {
      performAutoSync();
    }, syncInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, syncInterval, enfermarias?.length]);

  return {
    ...syncState,
    triggerSync,
    lastSyncTimeAgo: syncState.lastSyncTime
      ? getTimeAgo(syncState.lastSyncTime)
      : "Nunca",
  };
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return `há ${secondsAgo}s`;
  if (secondsAgo < 3600) return `há ${Math.floor(secondsAgo / 60)}m`;
  if (secondsAgo < 86400) return `há ${Math.floor(secondsAgo / 3600)}h`;
  return `há ${Math.floor(secondsAgo / 86400)}d`;
}
