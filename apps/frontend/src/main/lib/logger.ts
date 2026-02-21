/**
 * Unified Logging System for Main Process
 *
 * Replaces console.log with a structured logging system
 * - Development: console output with colors
 * - Production: electron-log with file rotation
 */

import log from 'electron-log';
import path from 'path';
import { app } from 'electron';

// Configure electron-log
log.transports.file.level = 'info';
log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'warn';

// Set log file location - use callback to ensure it works even before app is ready
log.transports.file.resolvePathFn = () => {
  try {
    return path.join(app.getPath('logs'), 'main.log');
  } catch {
    // Fallback if app is not ready yet
    return path.join(process.env.HOME || '/tmp', 'Library', 'Logs', 'ai-staff', 'main.log');
  }
};

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Color codes for console output
const colors: Record<string, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m',
};

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  timestamp: Date;
}

class Logger {
  private context: string;
  private isDevelopment: boolean;

  constructor(context = 'Main') {
    this.context = context;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${levelStr}] [${this.context}] ${message}${dataStr}`;
  }

  private logToConsole(level: LogLevel, message: string, data?: any): void {
    if (!this.isDevelopment) return;

    const color = colors[LogLevel[level]];
    const reset = colors.reset;
    const formattedMessage = this.formatMessage(level, message, data);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${color}${formattedMessage}${reset}`);
        break;
      case LogLevel.INFO:
        console.log(`${color}${formattedMessage}${reset}`);
        break;
      case LogLevel.WARN:
        console.warn(`${color}${formattedMessage}${reset}`);
        break;
      case LogLevel.ERROR:
        console.error(`${color}${formattedMessage}${reset}`);
        break;
    }
  }

  private logToFile(level: LogLevel, message: string, data?: any): void {
    const formattedMessage = this.formatMessage(level, message, data);

    switch (level) {
      case LogLevel.DEBUG:
        log.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        log.info(formattedMessage);
        break;
      case LogLevel.WARN:
        log.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        log.error(formattedMessage);
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.logToConsole(LogLevel.DEBUG, message, data);
    this.logToFile(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.logToConsole(LogLevel.INFO, message, data);
    this.logToFile(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.logToConsole(LogLevel.WARN, message, data);
    this.logToFile(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : error;

    this.logToConsole(LogLevel.ERROR, message, errorData);
    this.logToFile(LogLevel.ERROR, message, errorData);
  }

  /**
   * Create a child logger with a specific context
   */
  child(context: string): Logger {
    const childLogger = new Logger(`${this.context}:${context}`);
    return childLogger;
  }
}

// Create default logger instance
export const logger = new Logger();

// Convenience functions for direct import
export const debug = (message: string, data?: any) => logger.debug(message, data);
export const info = (message: string, data?: any) => logger.info(message, data);
export const warn = (message: string, data?: any) => logger.warn(message, data);
export const error = (message: string, err?: Error | any) => logger.error(message, err);

/**
 * Create a scoped logger for a specific module
 * @example
 * import { createLogger } from './lib/logger';
 * const log = createLogger('VSCodeEmbed');
 * log.info('Starting code-server');
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}
