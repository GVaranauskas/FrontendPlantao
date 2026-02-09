import { getAccessToken, setAccessToken, clearAccessToken } from "./auth-token";

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let initialRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let autoRefreshStarted = false;
let onAuthFailure: (() => void) | null = null;
let authFailureTriggered = false;
let lastRefreshAttempt = 0;

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const TOKEN_EXPIRY_BUFFER_MS = 2 * 60 * 1000;
const REFRESH_DEBOUNCE_MS = 5000;

export function setOnAuthFailure(callback: () => void): void {
  onAuthFailure = callback;
}

function handleAuthFailure(): void {
  if (authFailureTriggered) {
    return;
  }
  authFailureTriggered = true;
  
  stopAutoRefresh();
  clearAccessToken();
  if (onAuthFailure) {
    onAuthFailure();
  }
}

export function resetAuthFailure(): void {
  authFailureTriggered = false;
  lastRefreshAttempt = 0;
}

export function isAuthFailed(): boolean {
  return authFailureTriggered;
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  
  const expiryTime = payload.exp * 1000;
  const now = Date.now();
  const timeUntilExpiry = expiryTime - now;
  
  return timeUntilExpiry < TOKEN_EXPIRY_BUFFER_MS;
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  
  const expiryTime = payload.exp * 1000;
  return Date.now() >= expiryTime;
}

export async function refreshAccessToken(): Promise<boolean> {
  if (authFailureTriggered) {
    return false;
  }
  
  // If a refresh is already in flight, piggyback on the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const now = Date.now();
  if (now - lastRefreshAttempt < REFRESH_DEBOUNCE_MS) {
    console.log("[TokenRefresh] Debouncing refresh attempt");
    // Check if we already have a valid token from a recent refresh
    const currentToken = getAccessToken();
    if (currentToken && !isTokenExpired(currentToken)) {
      return true;
    }
    return false;
  }
  
  isRefreshing = true;
  lastRefreshAttempt = now;
  
  refreshPromise = (async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          console.log("[TokenRefresh] Token refreshed successfully");
          return true;
        }
      }
      
      console.warn("[TokenRefresh] Failed to refresh token, status:", response.status);
      return false;
    } catch (error) {
      console.error("[TokenRefresh] Error refreshing token:", error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

export async function ensureValidToken(): Promise<boolean> {
  if (authFailureTriggered) {
    return false;
  }
  
  const token = getAccessToken();
  
  if (!token) {
    return refreshAccessToken();
  }
  
  if (isTokenExpired(token)) {
    console.log("[TokenRefresh] Token expired, refreshing...");
    return refreshAccessToken();
  }
  
  if (isTokenExpiringSoon(token)) {
    console.log("[TokenRefresh] Token expiring soon, refreshing proactively...");
    return refreshAccessToken();
  }
  
  return true;
}

async function proactiveRefresh() {
  const token = getAccessToken();
  if (!token) return;
  
  if (isTokenExpiringSoon(token)) {
    console.log("[TokenRefresh] Proactive refresh triggered");
    await refreshAccessToken();
  }
}

export function startAutoRefresh(): void {
  if (autoRefreshStarted) {
    console.log("[TokenRefresh] Auto-refresh already started, skipping");
    return;
  }
  
  stopAutoRefresh();
  autoRefreshStarted = true;
  
  console.log("[TokenRefresh] Starting auto-refresh timer (every 10 minutes)");
  
  refreshTimer = setInterval(() => {
    proactiveRefresh();
  }, REFRESH_INTERVAL_MS);
  
  initialRefreshTimeout = setTimeout(() => {
    proactiveRefresh();
  }, 30000);
}

export function stopAutoRefresh(): void {
  autoRefreshStarted = false;
  
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  
  if (initialRefreshTimeout) {
    clearTimeout(initialRefreshTimeout);
    initialRefreshTimeout = null;
  }
  
  console.log("[TokenRefresh] Stopped auto-refresh timer");
}

export async function fetchWithAutoRefresh(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  if (authFailureTriggered) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  await ensureValidToken();
  
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
  
  if (response.status === 401 && !authFailureTriggered) {
    console.log("[TokenRefresh] Got 401, attempting refresh and retry...");

    const refreshed = await refreshAccessToken();

    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
      }

      response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });

      console.log("[TokenRefresh] Retry response status:", response.status);

      if (response.status === 401) {
        console.warn("[TokenRefresh] Still 401 after refresh, triggering auth failure");
        handleAuthFailure();
      }
    } else {
      // Only trigger auth failure if the token is truly invalid/missing
      const currentToken = getAccessToken();
      if (!currentToken || isTokenExpired(currentToken)) {
        console.warn("[TokenRefresh] Could not refresh and no valid token, triggering auth failure");
        handleAuthFailure();
      } else {
        // Token exists and is valid - retry with it (debounce may have returned false)
        headers.set("Authorization", `Bearer ${currentToken}`);
        response = await fetch(url, {
          ...options,
          headers,
          credentials: "include",
        });
        if (response.status === 401) {
          handleAuthFailure();
        }
      }
    }
  }
  
  return response;
}
