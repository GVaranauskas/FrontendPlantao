import { db } from '../lib/database';
import { auditLog, type InsertAuditLog } from '@shared/schema';
import { Request } from 'express';

interface AuditLogOptions {
  user: {
    id: string;
    name: string;
    role: string;
  };
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT';
  resource: string;
  resourceId?: string;
  changes?: { before?: unknown; after?: unknown };
  metadata?: Record<string, unknown>;
  req: Request;
  statusCode: number;
  errorMessage?: string;
  startTime: number;
}

class AuditService {
  async log(options: AuditLogOptions): Promise<void> {
    try {
      const duration = Date.now() - options.startTime;

      const logEntry: InsertAuditLog = {
        userId: options.user.id,
        userName: options.user.name,
        userRole: options.user.role,
        action: options.action,
        resource: options.resource,
        resourceId: options.resourceId,
        changes: options.changes ? JSON.stringify(options.changes) : null,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
        ipAddress: this.getClientIp(options.req),
        userAgent: options.req.headers['user-agent'] || null,
        endpoint: `${options.req.method} ${options.req.path}`,
        statusCode: options.statusCode,
        errorMessage: options.errorMessage,
        duration,
      };

      await db.insert(auditLog).values(logEntry);
      
      if (options.statusCode >= 400) {
        console.warn('[Audit]', {
          user: options.user.name,
          action: options.action,
          resource: options.resource,
          status: options.statusCode,
        });
      }
    } catch (error) {
      console.error('[Audit] Failed to log:', error);
    }
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0].trim();
    return req.socket.remoteAddress || 'unknown';
  }
}

export const auditService = new AuditService();
