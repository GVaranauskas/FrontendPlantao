import jwt, { JwtPayload } from 'jsonwebtoken';
import { User } from '@shared/schema';

const JWT_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '24h';
const REFRESH_EXPIRY = '7d';

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function generateAccessToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
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
    },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): Omit<JWTPayload, 'role'> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Omit<JWTPayload, 'role'>;
  } catch {
    return null;
  }
}
