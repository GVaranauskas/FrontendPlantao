/**
 * Common TypeScript types used across the application
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}
