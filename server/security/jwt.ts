import jwt, { JwtPayload } from 'jsonwebtoken';
import { User } from '@shared/schema';
import crypto from 'crypto';

const JWT_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '24h';
const REFRESH_EXPIRY = '7d';

// Generate a unique server instance ID on each server start
// This ensures all previous tokens become invalid when server restarts
const SERVER_INSTANCE_ID = crypto.randomBytes(8).toString('hex');

console.log(`[AUTH] New server instance started. Previous sessions invalidated.`);

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  sid?: string; // Server instance ID
  iat?: number;
  exp?: number;
}

export function generateAccessToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      sid: SERVER_INSTANCE_ID, // Include server instance ID
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
      sid: SERVER_INSTANCE_ID, // Include server instance ID
    },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Verify server instance ID matches current instance
    if (payload.sid !== SERVER_INSTANCE_ID) {
      console.log(`[AUTH] Token from previous server instance rejected`);
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
    
    // Verify server instance ID matches current instance
    if (payload.sid !== SERVER_INSTANCE_ID) {
      console.log(`[AUTH] Refresh token from previous server instance rejected`);
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}
