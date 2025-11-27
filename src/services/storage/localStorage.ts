/**
 * LocalStorage service with type safety
 */

const AUTH_TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'auth_token';
const REFRESH_TOKEN_KEY =
  import.meta.env.VITE_REFRESH_TOKEN_KEY || 'refresh_token';

export const storage = {
  // Auth tokens
  setAuthToken: (token: string): void => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  getAuthToken: (): string | null => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  removeAuthToken: (): void => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  setRefreshToken: (token: string): void => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  removeRefreshToken: (): void => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  // Clear all auth data
  clearAuth: (): void => {
    storage.removeAuthToken();
    storage.removeRefreshToken();
  },

  // Generic methods
  setItem: <T>(key: string, value: T): void => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  getItem: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },

  clear: (): void => {
    localStorage.clear();
  },
};
