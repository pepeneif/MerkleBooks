/**
 * Secure Logging Utility
 * Provides standardized logging that respects security configuration
 * and prevents sensitive data from being logged
 */

import { SECURITY_CONFIG } from './security-config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  function?: string;
  userId?: string;
  walletAddress?: string;
  [key: string]: any;
}

class SecureLogger {
  private static instance: SecureLogger;
  private logLevel: LogLevel;

  private constructor() {
    this.logLevel = SECURITY_CONFIG.ERROR_HANDLING.LOG_LEVEL;
  }

  public static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger();
    }
    return SecureLogger.instance;
  }

  /**
   * Check if a log level should be output based on current configuration
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return this.sanitizeString(String(data));
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Check if key contains sensitive field names
      const isSensitive = SECURITY_CONFIG.ERROR_HANDLING.SENSITIVE_FIELDS.some(
        field => key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = typeof value === 'object' ? this.sanitizeData(value) : this.sanitizeString(String(value));
      }
    }

    return sanitized;
  }

  /**
   * Sanitize string data
   */
  private sanitizeString(str: string): string {
    if (!str) return str;

    let sanitized = str;

    // Truncate if too long
    if (sanitized.length > SECURITY_CONFIG.ERROR_HANDLING.MAX_CONSOLE_LOG_LENGTH) {
      sanitized = sanitized.substring(0, SECURITY_CONFIG.ERROR_HANDLING.MAX_CONSOLE_LOG_LENGTH) + '...';
    }

    // Remove sensitive patterns
    SECURITY_CONFIG.ERROR_HANDLING.SENSITIVE_FIELDS.forEach(field => {
      // Remove patterns like privateKey=value, apiKey: value, etc.
      const patterns = [
        new RegExp(`${field}[=:]\\s*[^\\s,}\\]]+`, 'gi'),
        new RegExp(`"${field}"\\s*:\\s*"[^"]*"`, 'gi'),
        new RegExp(`'${field}'\\s*:\\s*'[^']*'`, 'gi'),
      ];

      patterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, `${field}=***`);
      });
    });

    return sanitized;
  }

  /**
   * Format log message with context
   */
  private formatMessage(message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}]`;

    if (context?.component) {
      formatted += ` [${context.component}]`;
    }

    if (context?.function) {
      formatted += ` [${context.function}]`;
    }

    formatted += ` ${message}`;

    return formatted;
  }

  /**
   * Debug level logging
   */
  public debug(message: string, data?: any, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;

    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const formattedMessage = this.formatMessage(message, context);

    if (sanitizedData) {
      console.debug(formattedMessage, sanitizedData);
    } else {
      console.debug(formattedMessage);
    }
  }

  /**
   * Info level logging
   */
  public info(message: string, data?: any, context?: LogContext): void {
    if (!this.shouldLog('info')) return;

    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const formattedMessage = this.formatMessage(message, context);

    if (sanitizedData) {
      console.info(formattedMessage, sanitizedData);
    } else {
      console.info(formattedMessage);
    }
  }

  /**
   * Warning level logging
   */
  public warn(message: string, data?: any, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;

    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const formattedMessage = this.formatMessage(message, context);

    if (sanitizedData) {
      console.warn(formattedMessage, sanitizedData);
    } else {
      console.warn(formattedMessage);
    }
  }

  /**
   * Error level logging
   */
  public error(message: string, error?: Error | any, context?: LogContext): void {
    if (!this.shouldLog('error')) return;

    const formattedMessage = this.formatMessage(message, context);

    if (error instanceof Error) {
      const sanitizedError = {
        name: error.name,
        message: this.sanitizeString(error.message),
        stack: error.stack ? this.sanitizeString(error.stack) : undefined,
      };
      console.error(formattedMessage, sanitizedError);
    } else if (error) {
      const sanitizedData = this.sanitizeData(error);
      console.error(formattedMessage, sanitizedData);
    } else {
      console.error(formattedMessage);
    }
  }

  /**
   * Log API request/response for debugging
   */
  public apiLog(
    method: string,
    url: string,
    status?: number,
    duration?: number,
    error?: Error,
    context?: LogContext
  ): void {
    const sanitizedUrl = this.sanitizeString(url);
    const message = `API ${method.toUpperCase()} ${sanitizedUrl}${status ? ` - ${status}` : ''}${duration ? ` (${duration}ms)` : ''}`;

    if (error) {
      this.error(message, error, { ...context, function: 'apiLog' });
    } else {
      this.info(message, undefined, { ...context, function: 'apiLog' });
    }
  }

  /**
   * Log security events
   */
  public security(event: string, details?: any, context?: LogContext): void {
    const message = `SECURITY: ${event}`;
    this.warn(message, details, { ...context, function: 'security' });
  }

  /**
   * Log performance metrics
   */
  public performance(operation: string, duration: number, details?: any, context?: LogContext): void {
    const message = `PERFORMANCE: ${operation} completed in ${duration}ms`;
    if (duration > 5000) { // Log as warning if operation takes > 5 seconds
      this.warn(message, details, { ...context, function: 'performance' });
    } else {
      this.info(message, details, { ...context, function: 'performance' });
    }
  }

  /**
   * Set log level dynamically
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get current log level
   */
  public getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

// Export singleton instance
export const logger = SecureLogger.getInstance();

// Export convenience functions
export const logDebug = (message: string, data?: any, context?: LogContext) => 
  logger.debug(message, data, context);

export const logInfo = (message: string, data?: any, context?: LogContext) => 
  logger.info(message, data, context);

export const logWarn = (message: string, data?: any, context?: LogContext) => 
  logger.warn(message, data, context);

export const logError = (message: string, error?: Error | any, context?: LogContext) => 
  logger.error(message, error, context);

export const logApi = (
  method: string,
  url: string,
  status?: number,
  duration?: number,
  error?: Error,
  context?: LogContext
) => logger.apiLog(method, url, status, duration, error, context);

export const logSecurity = (event: string, details?: any, context?: LogContext) => 
  logger.security(event, details, context);

export const logPerformance = (operation: string, duration: number, details?: any, context?: LogContext) => 
  logger.performance(operation, duration, details, context);

// Export types
export type { LogLevel, LogContext };