import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "./queryClient";
import { setAccessToken, clearAccessToken, getAccessToken } from "./auth-token";
import { startAutoRefresh, stopAutoRefresh, refreshAccessToken, setOnAuthFailure, resetAuthFailure } from "./token-refresh";
import { useAnalytics } from "@/hooks/use-analytics";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const analytics = useAnalytics();
  const sessionStartedRef = useRef(false);

  const handleAuthFailure = useCallback(() => {
    console.log("[Auth] Auth failure detected, clearing user state");
    setUser(null);
    setLocation("/");
  }, [setLocation]);

  useEffect(() => {
    setOnAuthFailure(handleAuthFailure);
    return () => setOnAuthFailure(() => {});
  }, [handleAuthFailure]);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const existingToken = getAccessToken();
      if (!existingToken) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          setUser(null);
          setIsLoading(false);
          return;
        }
      }
      
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        headers,
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        startAutoRefresh();
      } else {
        stopAutoRefresh();
        setUser(null);
      }
    } catch {
      stopAutoRefresh();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const analyticsRef = useRef(analytics);
  analyticsRef.current = analytics;

  useEffect(() => {
    const isAuthenticated = !!user;
    if (isAuthenticated && !sessionStartedRef.current) {
      sessionStartedRef.current = true;
      analyticsRef.current.startSession();
    } else if (!isAuthenticated && sessionStartedRef.current) {
      sessionStartedRef.current = false;
      analyticsRef.current.endSession('logout');
    }
  }, [user]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Login failed");
    }
    const data = await response.json();
    setAccessToken(data.accessToken);
    setUser(data.user);
    resetAuthFailure();
    startAutoRefresh();
  }, []);

  const logout = useCallback(async () => {
    stopAutoRefresh();
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {
      // Ignore errors on logout
    }
    clearAccessToken();
    setUser(null);
    setLocation("/");
  }, [setLocation]);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  }), [user, isLoading, login, logout, checkAuth]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function RequireAuth({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    console.log("RequireAuth - isLoading:", isLoading, "isAuthenticated:", isAuthenticated, "user:", user);
    
    if (!isLoading) {
      if (!isAuthenticated) {
        console.log("RequireAuth - Redirecting to login");
        setLocation("/");
      } else if (user?.firstAccess) {
        console.log("RequireAuth - First access, redirecting to password change");
        setLocation("/first-access");
      } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        console.log("RequireAuth - Access denied for role:", user.role);
        setLocation("/modules");
      }
    }
  }, [isLoading, isAuthenticated, setLocation, user, allowedRoles]);

  // Block rendering completely until auth check completes
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Block rendering if not authenticated (redirect will happen via useEffect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // Only render children when authenticated
  return <>{children}</>;
}

export function FirstAccessGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setLocation("/");
      } else if (!user?.firstAccess) {
        setLocation("/modules");
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.firstAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
