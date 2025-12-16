import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '@shared/schema';
import { env, isProductionEnv } from '../config/env';

function getJWTSecret(): string {
  if (isProductionEnv && env.SESSION_SECRET === 'dev-secret-change-in-production') {
    throw new Error('SESSION_SECRET must be set in production environment');
  }
  return env.SESSION_SECRET;
}

const JWT_SECRET = getJWTSecret();
const JWT_EXPIRY = '24h';
const REFRESH_EXPIRY = '7d';

const SESSION_VERSION = process.env.SESSION_VERSION || '1';
const STABLE_INSTANCE_ID = crypto
  .createHash('sha256')
  .update(JWT_SECRET + SESSION_VERSION)
  .digest('hex')
  .substring(0, 16);

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  sid?: string;
  iat?: number;
  exp?: number;
}

export function generateAccessToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      sid: STABLE_INSTANCE_ID,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function generateRefreshToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      sid: STABLE_INSTANCE_ID,
    },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    if (payload.sid && payload.sid !== STABLE_INSTANCE_ID) {
      console.log(`[AUTH] Token invalidated by session version change`);
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): Omit<JWTPayload, 'role'> | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as Omit<JWTPayload, 'role'>;
    
    if (payload.sid && payload.sid !== STABLE_INSTANCE_ID) {
      console.log(`[AUTH] Refresh token invalidated by session version change`);
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}
