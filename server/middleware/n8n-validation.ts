import { Request, Response, NextFunction } from 'express';
import { validateN8NWebhook, validateN8NSourceIP } from '../security/n8n-validation';
import { AppError } from './error-handler';

/**
 * Middleware to validate N8N webhook requests
 */
export function validateN8NRequest(req: Request, res: Response, next: NextFunction) {
  // Validate source IP
  const clientIP = req.ip || req.socket.remoteAddress || '';
  if (!validateN8NSourceIP(clientIP)) {
    throw new AppError(403, 'Unauthorized IP address', { clientIP });
  }

  // Validate webhook signature
  const signature = req.headers['x-n8n-signature'] as string;
  const rawBody = (req as any).rawBody as string || JSON.stringify(req.body);

  if (!validateN8NWebhook(rawBody, signature)) {
    console.warn('[N8N] Invalid webhook signature', { clientIP });
    throw new AppError(401, 'Invalid webhook signature');
  }

  next();
}
