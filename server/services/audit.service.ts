import { db } from '../lib/database';
import { auditLog, type InsertAuditLog } from '@shared/schema';
import { Request } from 'express';

type AuditAction = 
  | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT'
  | 'PATIENT_ARCHIVED' | 'PATIENT_REACTIVATED' | 'BED_CONFLICT'
  | 'SHIFT_HANDOVER_VIEW' | 'SHIFT_HANDOVER_PRINT'
  | 'SYNC_STARTED' | 'SYNC_COMPLETED';

interface AuditLogOptions {
  user: {
    id: string;
    name: string;
    role: string;
  };
  action: AuditAction;
  resource: string;
  resourceId?: string;
  changes?: { before?: unknown; after?: unknown };
  metadata?: Record<string, unknown>;
  req: Request;
  statusCode: number;
  errorMessage?: string;
  startTime: number;
}

interface SystemAuditOptions {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
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

  async logSystem(options: SystemAuditOptions): Promise<void> {
    try {
      const logEntry: InsertAuditLog = {
        userId: null,
        userName: 'Sistema',
        userRole: 'system',
        action: options.action,
        resource: options.resource,
        resourceId: options.resourceId,
        changes: options.changes ? JSON.stringify(options.changes) : null,
        metadata: options.metadata ? JSON.stringify({ ...options.metadata, timestamp: new Date().toISOString() }) : null,
        ipAddress: options.ipAddress || 'system',
        userAgent: options.userAgent || null,
        endpoint: options.endpoint || '/api/sync',
        statusCode: 200,
        errorMessage: null,
        duration: 0,
      };

      await db.insert(auditLog).values(logEntry);
      console.log(`[Audit] ${options.action} - ${options.resource} (${options.resourceId || 'N/A'})`);
    } catch (error) {
      console.error('[Audit] Failed to log system event:', error);
    }
  }

  async logPatientArchived(
    patientId: string,
    patientName: string,
    leito: string,
    codigoAtendimento: string,
    motivo: string
  ): Promise<void> {
    await this.logSystem({
      action: 'PATIENT_ARCHIVED',
      resource: 'patient',
      resourceId: patientId,
      changes: { nome: patientName, leito, codigoAtendimento, motivoArquivamento: motivo },
    });
  }

  async logPatientReactivated(
    patientId: string,
    patientName: string,
    leito: string,
    codigoAtendimento: string
  ): Promise<void> {
    await this.logSystem({
      action: 'PATIENT_REACTIVATED',
      resource: 'patient',
      resourceId: patientId,
      changes: { nome: patientName, leito, codigoAtendimento },
    });
  }

  async logBedConflict(
    oldPatientId: string,
    oldPatientName: string,
    newCodigoAtendimento: string,
    leito: string
  ): Promise<void> {
    await this.logSystem({
      action: 'BED_CONFLICT',
      resource: 'patient',
      resourceId: oldPatientId,
      changes: { oldPatientName, newCodigoAtendimento, leito, action: 'archived_and_removed' },
    });
  }

  async logShiftHandoverView(
    userId: string,
    userName: string,
    userRole: string,
    nursingUnit: string,
    patientCount: number,
    req: Request
  ): Promise<void> {
    const startTime = Date.now();
    await this.log({
      user: { id: userId, name: userName, role: userRole },
      action: 'SHIFT_HANDOVER_VIEW',
      resource: 'shift_handover',
      resourceId: nursingUnit,
      metadata: { patientCount },
      req,
      statusCode: 200,
      startTime,
    });
  }

  async logShiftHandoverPrint(
    userId: string,
    userName: string,
    userRole: string,
    nursingUnit: string,
    patientCount: number,
    req: Request
  ): Promise<void> {
    const startTime = Date.now();
    await this.log({
      user: { id: userId, name: userName, role: userRole },
      action: 'SHIFT_HANDOVER_PRINT',
      resource: 'shift_handover',
      resourceId: nursingUnit,
      metadata: { patientCount },
      req,
      statusCode: 200,
      startTime,
    });
  }

  async logSyncStarted(unitIds: string, triggeredBy: string = 'auto'): Promise<void> {
    await this.logSystem({
      action: 'SYNC_STARTED',
      resource: 'sync',
      resourceId: unitIds,
      metadata: { triggeredBy },
    });
  }

  async logSyncCompleted(
    unitIds: string,
    patientsProcessed: number,
    patientsArchived: number,
    duration: number
  ): Promise<void> {
    await this.logSystem({
      action: 'SYNC_COMPLETED',
      resource: 'sync',
      resourceId: unitIds,
      metadata: { patientsProcessed, patientsArchived, durationMs: duration },
    });
  }
}

export const auditService = new AuditService();
