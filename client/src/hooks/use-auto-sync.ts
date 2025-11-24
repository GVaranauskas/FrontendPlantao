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

  // Fetch enfermarias list for sync
  const { data: enfermarias, isLoading: isLoadingEnfermarias } = useQuery<Enfermaria[]>({
    queryKey: ["/api/enfermarias"],
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60, // Keep in garbage collection for 1 hour
    retry: 2,
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
    if (!isPageVisibleRef.current) {
      console.log("[Auto-sync] Page not visible, skipping sync");
      return;
    }

    if (!enfermarias?.length) {
      console.log("[Auto-sync] Enfermarias not loaded yet, skipping sync");
      return;
    }

    setSyncState(prev => ({ ...prev, isSyncing: true, syncStatus: "syncing" }));
    let totalImported = 0;
    let totalErrors = 0;

    try {
      // Process each enfermaria sequentially with delays
      for (const enfermaria of enfermarias) {
        try {
          const res = await apiRequest("POST", "/api/import/evolucoes", {
            enfermaria: enfermaria.codigo,
          });
          
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          
          const data = (await res.json()) as {
            success: boolean;
            stats: { total: number; importados: number; erros: number };
          };

          if (data.success) {
            totalImported += data.stats.importados;
            totalErrors += data.stats.erros;
            console.log(`[Auto-sync] ✓ ${enfermaria.codigo}: ${data.stats.importados} imported`);
          } else {
            totalErrors++;
            console.warn(`[Auto-sync] ✗ ${enfermaria.codigo}: sync failed`);
          }
        } catch (error) {
          console.error(`[Auto-sync] Error syncing ${enfermaria.codigo}:`, error);
          totalErrors++;
        }
        
        // Small delay between requests to avoid hammering the API
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Invalidate patient cache to refresh UI
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });

      // Log summary
      console.log(
        `[Auto-sync] ✓ Completed: ${totalImported} imported, ${totalErrors} errors from ${enfermarias.length} enfermarias`
      );

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncStatus: "success",
        lastSyncTime: new Date(),
        totalImported,
        totalErrors,
      }));

      // Auto-hide success message after 3 seconds
      const hideTimer = setTimeout(() => {
        setSyncState(prev => ({ ...prev, syncStatus: "idle" }));
      }, 3000);

      return () => clearTimeout(hideTimer);
    } catch (error) {
      console.error("[Auto-sync] Critical error:", error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncStatus: "error",
        totalErrors: totalErrors + 1,
      }));

      // Auto-hide error message after 4 seconds
      const hideTimer = setTimeout(() => {
        setSyncState(prev => ({ ...prev, syncStatus: "idle" }));
      }, 4000);

      return () => clearTimeout(hideTimer);
    }
  };

  // Manual sync trigger
  const triggerSync = async () => {
    await performAutoSync();
  };

  // Setup interval for periodic sync
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // First sync immediately on mount (wait a bit for enfermarias to load)
    const initialSyncTimer = setTimeout(() => {
      if (enfermarias?.length) {
        console.log("[Auto-sync] Starting initial sync");
        performAutoSync();
      }
    }, 500);

    // Setup periodic sync only if enfermarias are loaded
    if (enfermarias?.length) {
      intervalRef.current = setInterval(() => {
        performAutoSync();
      }, syncInterval);

      console.log(`[Auto-sync] Interval started: sync every ${syncInterval / 1000 / 60} minutes`);
    }

    return () => {
      clearTimeout(initialSyncTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, syncInterval, enfermarias?.length, enfermarias]);

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
