import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface AnalyticsEvent {
  eventType: 'page_view' | 'action';
  pagePath?: string;
  pageTitle?: string;
  actionName?: string;
  actionCategory?: string;
  entityType?: string;
  entityId?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}

interface AnalyticsSession {
  id: string;
  userId: string;
  userName: string;
  startedAt: string;
}

const SESSION_STORAGE_KEY = 'analytics_session_id';
const HEARTBEAT_INTERVAL = 60000;
const BATCH_INTERVAL = 5000;
const MAX_BATCH_SIZE = 20;

export function useAnalytics() {
  const [location] = useLocation();
  const sessionIdRef = useRef<string | null>(null);
  const eventQueueRef = useRef<AnalyticsEvent[]>([]);
  const lastPageRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const batchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getSessionId = useCallback(() => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      sessionIdRef.current = stored;
      return stored;
    }
    return null;
  }, []);

  const startSession = useCallback(async () => {
    try {
      const response = await apiRequest('POST', '/api/analytics/sessions', {
        userAgent: navigator.userAgent,
        ipAddress: null
      });
      
      const data: AnalyticsSession = await response.json();
      sessionIdRef.current = data.id;
      sessionStorage.setItem(SESSION_STORAGE_KEY, data.id);
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(() => {
        sendHeartbeat();
      }, HEARTBEAT_INTERVAL);
      
      return data.id;
    } catch (error) {
      console.error('[Analytics] Failed to start session:', error);
      return null;
    }
  }, []);

  const endSession = useCallback(async (reason?: string) => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    
    try {
      await flushEvents();
      
      await apiRequest('POST', `/api/analytics/sessions/${sessionId}/end`, {
        logoutReason: reason || 'manual'
      });
      
      sessionIdRef.current = null;
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    } catch (error) {
      console.error('[Analytics] Failed to end session:', error);
    }
  }, [getSessionId]);

  const sendHeartbeat = useCallback(async () => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    
    try {
      await apiRequest('POST', `/api/analytics/sessions/${sessionId}/heartbeat`, {});
    } catch {
      // Silent fail for heartbeats
    }
  }, [getSessionId]);

  const flushEvents = useCallback(async () => {
    if (eventQueueRef.current.length === 0) return;
    
    const sessionId = getSessionId();
    const events = [...eventQueueRef.current];
    eventQueueRef.current = [];
    
    try {
      await apiRequest('POST', '/api/analytics/events/batch', { events, sessionId });
    } catch (error) {
      console.error('[Analytics] Failed to send events batch:', error);
      eventQueueRef.current = [...events.slice(0, MAX_BATCH_SIZE), ...eventQueueRef.current].slice(0, MAX_BATCH_SIZE * 2);
    }
  }, [getSessionId]);

  // Track a single event
  const trackEvent = useCallback((event: AnalyticsEvent) => {
    eventQueueRef.current.push(event);
    
    // Flush immediately if queue is full
    if (eventQueueRef.current.length >= MAX_BATCH_SIZE) {
      flushEvents();
    }
  }, [flushEvents]);

  // Track page view
  const trackPageView = useCallback((pagePath: string, pageTitle?: string) => {
    if (pagePath === lastPageRef.current) return; // Avoid duplicates
    lastPageRef.current = pagePath;
    
    trackEvent({
      eventType: 'page_view',
      pagePath,
      pageTitle: pageTitle || document.title,
      referrer: document.referrer
    });
  }, [trackEvent]);

  // Track action
  const trackAction = useCallback((actionName: string, options?: {
    category?: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }) => {
    trackEvent({
      eventType: 'action',
      actionName,
      actionCategory: options?.category,
      entityType: options?.entityType,
      entityId: options?.entityId,
      metadata: options?.metadata
    });
  }, [trackEvent]);

  // Auto-track page views on location change
  useEffect(() => {
    if (location) {
      trackPageView(location);
    }
  }, [location, trackPageView]);

  // Setup batch interval
  useEffect(() => {
    batchIntervalRef.current = setInterval(() => {
      flushEvents();
    }, BATCH_INTERVAL);
    
    return () => {
      if (batchIntervalRef.current) {
        clearInterval(batchIntervalRef.current as unknown as number);
      }
    };
  }, [flushEvents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      flushEvents();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current as unknown as number);
      }
      if (batchIntervalRef.current) {
        clearInterval(batchIntervalRef.current as unknown as number);
      }
    };
  }, [flushEvents]);

  // Handle page visibility change (track session end on tab close)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushEvents();
      }
    };
    
    const handleBeforeUnload = () => {
      flushEvents();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushEvents]);

  return {
    startSession,
    endSession,
    trackPageView,
    trackAction,
    getSessionId,
    flushEvents
  };
}

// Higher-level hook for automatic tracking in authenticated context
export function useAutoAnalytics(isAuthenticated: boolean) {
  const analytics = useAnalytics();
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !sessionStartedRef.current) {
      sessionStartedRef.current = true;
      analytics.startSession();
    } else if (!isAuthenticated && sessionStartedRef.current) {
      sessionStartedRef.current = false;
      analytics.endSession('logout');
    }
  }, [isAuthenticated, analytics]);

  return analytics;
}
