import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logDir = process.env.LOG_DIR || './logs';

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};

winston.addColors(customLevels.colors);

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const fileRotateTransport = new DailyRotateFile({
  filename: `${logDir}/app-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '90d',
  format: customFormat,
  level: 'http',
});

const errorFileRotateTransport = new DailyRotateFile({
  filename: `${logDir}/error-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '90d',
  format: customFormat,
  level: 'error',
});

const winstonLogger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: customFormat,
  transports: [
    fileRotateTransport,
    errorFileRotateTransport,
  ],
});

if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

interface Logger {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, context?: Record<string, unknown>) => void;
  debug: (message: string, context?: Record<string, unknown>) => void;
  http: (method: string, path: string, statusCode: number, duration: number, message?: string) => void;
}

export const logger: Logger = {
  info(message: string, context?: Record<string, unknown>) {
    winstonLogger.info(message, context);
  },

  warn(message: string, context?: Record<string, unknown>) {
    winstonLogger.warn(message, context);
  },

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    winstonLogger.error(message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      ...context,
    });
  },

  debug(message: string, context?: Record<string, unknown>) {
    winstonLogger.debug(message, context);
  },

  http(method: string, path: string, statusCode: number, duration: number, message?: string) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    winstonLogger.log(level, `${method} ${path}`, {
      statusCode,
      duration: `${duration}ms`,
      message,
    });
  },
};

export function logError(message: string, error: Error, context?: Record<string, unknown>) {
  logger.error(message, error, context);
}

export function logInfo(message: string, context?: Record<string, unknown>) {
  logger.info(message, context);
}

export function logWarn(message: string, context?: Record<string, unknown>) {
  logger.warn(message, context);
}

export function logHttp(method: string, path: string, statusCode: number, duration: number, userId?: string) {
  winstonLogger.log('http', 'HTTP Request', {
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
    userId,
  });
}
