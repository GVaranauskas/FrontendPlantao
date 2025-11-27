/**
 * API Endpoints
 * Centralized endpoint definitions for the application
 */

export const ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },

  // Plantao endpoints
  PLANTAO: {
    LIST: '/plantoes',
    CREATE: '/plantoes',
    GET_BY_ID: (id: string) => `/plantoes/${id}`,
    UPDATE: (id: string) => `/plantoes/${id}`,
    DELETE: (id: string) => `/plantoes/${id}`,
  },

  // User endpoints
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    GET_BY_ID: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
  },
} as const;
