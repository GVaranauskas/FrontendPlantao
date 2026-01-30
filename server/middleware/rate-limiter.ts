import rateLimit from 'express-rate-limit';
import { logger } from '../lib/logger';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: { 
    error: { 
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      status: 429
    } 
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json(options.message);
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});

export const refreshRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // 10 tentativas por minuto
  message: { 
    error: { 
      message: 'Muitas requisições. Aguarde um momento.',
      status: 429
    } 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 requisições por minuto
  message: { 
    error: { 
      message: 'Limite de requisições excedido. Aguarde um momento.',
      status: 429
    } 
  },
  standardHeaders: true,
  legacyHeaders: false,
});
