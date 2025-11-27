import { createHmac } from 'crypto';

/**
 * Validates N8N webhook signature
 * In production, configure N8N to sign webhook requests with a shared secret
 */
export function validateN8NWebhook(
  payload: string,
  signature: string | undefined,
  secret: string = process.env.N8N_WEBHOOK_SECRET || 'dev-secret'
): boolean {
  if (!signature) {
    // In development, allow unsigned requests
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }

  const computedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === computedSignature;
}

/**
 * Allowed N8N source IPs for additional security
 * Add your N8N server IP to this list in production
 */
export const ALLOWED_N8N_IPS = process.env.N8N_ALLOWED_IPS
  ? process.env.N8N_ALLOWED_IPS.split(',')
  : ['127.0.0.1', 'localhost']; // Development defaults

export function validateN8NSourceIP(clientIP: string): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  return ALLOWED_N8N_IPS.includes(clientIP);
}
