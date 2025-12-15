import { createHmac } from 'crypto';
import { env, isDevelopmentEnv, getN8NAllowedIPs } from '../config/env';

/**
 * Validates N8N webhook signature
 * In production, configure N8N to sign webhook requests with a shared secret
 */
export function validateN8NWebhook(
  payload: string,
  signature: string | undefined,
  secret: string = env.N8N_WEBHOOK_SECRET
): boolean {
  if (!signature) {
    // In development, allow unsigned requests
    if (isDevelopmentEnv) {
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
export const ALLOWED_N8N_IPS = getN8NAllowedIPs();

export function validateN8NSourceIP(clientIP: string): boolean {
  if (isDevelopmentEnv) {
    return true;
  }
  return ALLOWED_N8N_IPS.includes(clientIP);
}
