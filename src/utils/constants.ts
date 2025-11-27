/**
 * Application-wide constants
 */

export const APP_NAME =
  import.meta.env.VITE_APP_NAME || 'Frontend Plantão';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

export const DATE_FORMATS = {
  DEFAULT: 'dd/MM/yyyy',
  WITH_TIME: 'dd/MM/yyyy HH:mm',
  TIME_ONLY: 'HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss",
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

export const QUERY_KEYS = {
  PLANTOES: 'plantoes',
  PLANTAO: 'plantao',
  USERS: 'users',
  USER: 'user',
  AUTH_USER: 'auth-user',
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
} as const;
