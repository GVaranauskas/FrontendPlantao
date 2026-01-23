import { useEffect, useRef, useState, useCallback } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AutoSyncState {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  totalImported: number;
  totalErrors: number;
}

interface UseAutoSyncProps {
  enabled?: boolean;
  syncInterval?: number; // milliseconds, default 900000 = 15 min
}

export function useAutoSync(props?: UseAutoSyncProps) {
  const { enabled = false, syncInterval = 900000 } = props || {}; // Default 15 minutes

  const [syncState, setSyncState] = useState<AutoSyncState>({
    isSyncing: false,
    lastSyncTime: null,
    syncStatus: "idle",
    totalImported: 0,
    totalErrors: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialSyncDoneRef = useRef(false);
  const isSyncingRef = useRef(false);

  // Function to sync all units using the new endpoint
  const performAutoSync = useCallback(async () => {
    // Prevent concurrent syncs
    if (isSyncingRef.current) {
      console.log("[Auto-sync] Already syncing, skipping");
      return;
    }

    isSyncingRef.current = true;
    setSyncState(prev => ({ ...prev, isSyncing: true, syncStatus: "syncing" }));

    try {
      console.log("[Auto-sync] Starting sync for all units...");
      
      // Use the new unified sync endpoint with empty unitIds for all units
      const res = await apiRequest("POST", "/api/sync/evolucoes", {
        unitIds: "", // Empty string = all units
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = (await res.json()) as {
        success: boolean;
        message: string;
        stats?: { total: number; imported: number; updated: number; errors: number };
      };

      // Force refetch patient cache to refresh UI immediately (resolve staleTime: Infinity issue)
      await queryClient.refetchQueries({ queryKey: ["/api/patients"] });

      const imported = data.stats?.imported || 0;
      const updated = data.stats?.updated || 0;
      const errors = data.stats?.errors || 0;

      console.log(`[Auto-sync] ✓ Completed: ${imported} new, ${updated} updated, ${errors} errors`);

      setSyncState({
        isSyncing: false,
        syncStatus: "success",
        lastSyncTime: new Date(),
        totalImported: imported + updated,
        totalErrors: errors,
      });

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSyncState(prev => ({ ...prev, syncStatus: "idle" }));
      }, 5000);

    } catch (error) {
      console.error("[Auto-sync] Error:", error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncStatus: "error",
        totalErrors: prev.totalErrors + 1,
      }));

      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setSyncState(prev => ({ ...prev, syncStatus: "idle" }));
      }, 5000);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    await performAutoSync();
  }, [performAutoSync]);

  // Initial sync on mount + periodic sync every 15 minutes
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      initialSyncDoneRef.current = false;
      return;
    }

    // Initial sync only once on mount
    if (!initialSyncDoneRef.current) {
      initialSyncDoneRef.current = true;
      console.log("[Auto-sync] Performing initial sync on page load");
      performAutoSync();
    }

    // Setup periodic sync interval (15 minutes by default)
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        console.log(`[Auto-sync] Periodic sync triggered (every ${syncInterval / 1000 / 60} minutes)`);
        performAutoSync();
      }, syncInterval);
      
      console.log(`[Auto-sync] Interval configured: sync every ${syncInterval / 1000 / 60} minutes`);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, syncInterval, performAutoSync]);

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
