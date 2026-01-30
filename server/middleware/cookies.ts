import { Response } from 'express';
import { isProductionEnv } from '../config/env';

/**
 * Set secure JWT cookie
 * Uses HttpOnly + Secure flags to prevent XSS access
 */
export function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: isProductionEnv,
    sameSite: 'strict', // SECURITY: Strict SameSite to prevent CSRF
    maxAge: 15 * 60 * 1000, // 15 minutes (matching JWT_EXPIRY)
    path: '/',
  });
}

/**
 * Set secure refresh token cookie
 */
export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProductionEnv,
    sameSite: 'strict', // SECURITY: Strict SameSite to prevent CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
}
