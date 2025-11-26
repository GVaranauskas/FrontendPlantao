export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    statusCode?: number;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatEntry(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Development: simple format
      let output = `[${entry.level.toUpperCase()}] ${entry.message}`;
      if (entry.error) {
        output += ` | Error: ${entry.error.name}: ${entry.error.message}`;
      }
      if (entry.context && Object.keys(entry.context).length > 0) {
        output += ` | Context: ${JSON.stringify(entry.context)}`;
      }
      return output;
    } else {
      // Production: structured JSON
      return JSON.stringify(entry);
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        statusCode: (error as any).statusCode,
      } : undefined,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case 'debug':
        if (this.isDevelopment) console.debug(formatted);
        break;
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, context, error);
  }

  http(method: string, path: string, statusCode: number, duration: number, message?: string) {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `${method} ${path}`, {
      statusCode,
      duration: `${duration}ms`,
      message,
    });
  }
}

export const logger = new Logger();
