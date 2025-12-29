import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

// Campos sensíveis que NÃO devem aparecer no audit log
const SENSITIVE_FIELDS = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey'];

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body as Record<string, unknown> };
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}

function isSensitiveOperation(req: Request): boolean {
  const method = req.method;
  const path = req.path;
  
  // Operações de escrita são sempre sensíveis
  if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
    return true;
  }
  
  // Rotas específicas sensíveis
  if (path.includes('/patients') || path.includes('/users') || path.includes('/import') || path.includes('/sync')) {
    return true;
  }
  
  return false;
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalJson = res.json.bind(res);
  
  // Captura body sanitizado para audit (antes de modificações)
  const sanitizedBody = req.body ? sanitizeBody(req.body) : null;
  
  res.json = function(body: unknown) {
    const result = originalJson(body);
    
    const shouldLog = shouldAudit(req);
    const isSensitive = isSensitiveOperation(req);
    const isError = res.statusCode >= 400;
    
    // Registra operações sensíveis ou erros (mesmo sem autenticação para rastreamento de tentativas)
    if (shouldLog && (isSensitive || isError)) {
      const action = determineAction(req);
      const resource = extractResource(req);
      const resourceId = extractResourceId(req, body);
      
      // Extrai mensagem de erro se houver
      let errorMessage: string | undefined;
      if (isError && body && typeof body === 'object') {
        const errorBody = body as Record<string, unknown>;
        errorMessage = (errorBody.message as string) || 
                       ((errorBody.error as Record<string, unknown>)?.message as string) || 
                       undefined;
      }
      
      auditService.log({
        user: {
          id: req.user?.userId || 'anonymous',
          name: req.user?.username || 'anonymous',
          role: req.user?.role || 'none',
        },
        action: action as 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT',
        resource,
        resourceId,
        changes: isSensitive ? { body: sanitizedBody } : undefined,
        metadata: { query: req.query, params: req.params, sensitive: isSensitive },
        req,
        statusCode: res.statusCode,
        errorMessage,
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
