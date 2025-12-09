import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalJson = res.json.bind(res);
  
  res.json = function(body: unknown) {
    const result = originalJson(body);
    
    if (req.user && shouldAudit(req)) {
      const action = determineAction(req);
      const resource = extractResource(req);
      const resourceId = extractResourceId(req, body);
      
      auditService.log({
        user: {
          id: req.user.userId,
          name: req.user.username,
          role: req.user.role,
        },
        action: action as 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT',
        resource,
        resourceId,
        metadata: { query: req.query, params: req.params },
        req,
        statusCode: res.statusCode,
        startTime,
      }).catch(error => {
        console.error('[Audit Middleware] Failed:', error);
      });
    }
    
    return result;
  };
  
  next();
}

function shouldAudit(req: Request): boolean {
  const path = req.path;
  if (path === '/health') return false;
  if (path.startsWith('/static')) return false;
  if (path === '/api/csrf-token') return false;
  return path.startsWith('/api/');
}

function determineAction(req: Request): string {
  const method = req.method;
  const path = req.path;
  
  if (path.includes('/login')) return 'LOGIN';
  if (path.includes('/logout')) return 'LOGOUT';
  if (path.includes('/export')) return 'EXPORT';
  if (path.includes('/import')) return 'IMPORT';
  
  switch (method) {
    case 'POST': return 'CREATE';
    case 'GET': return 'READ';
    case 'PUT':
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return method;
  }
}

function extractResource(req: Request): string {
  const path = req.path;
  if (path.includes('/patients')) return 'patients';
  if (path.includes('/users')) return 'users';
  if (path.includes('/templates')) return 'templates';
  if (path.includes('/alerts')) return 'alerts';
  if (path.includes('/auth')) return 'sessions';
  const match = path.match(/\/api\/([^\/]+)/);
  return match ? match[1] : 'unknown';
}

function extractResourceId(req: Request, body: unknown): string | undefined {
  if (req.params.id) return req.params.id;
  if (req.params.patientId) return req.params.patientId;
  if (body && typeof body === 'object' && 'id' in body) return (body as { id: string }).id;
  return undefined;
}
