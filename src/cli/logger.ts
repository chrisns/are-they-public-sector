/**
 * Logger configuration for UK Public Sector Organisation Aggregator CLI
 * Provides structured logging with levels, debug mode, and progress indicators
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { performance } from 'perf_hooks';

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  level: LogLevel;
  debugMode: boolean;
  logToFile: boolean;
  logFilePath?: string;
  showProgress: boolean;
  useColors: boolean;
}

/**
 * Progress indicator state
 */
interface ProgressState {
  active: boolean;
  startTime: number;
  lastUpdate: number;
  message: string;
  current?: number;
  total?: number | undefined;
}

/**
 * Logger class with structured logging capabilities
 */
export class Logger {
  private config: LoggerConfig;
  private progressState: ProgressState | null = null;
  private progressInterval: NodeJS.Timeout | null = null;
  private startTime: number;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: LogLevel.INFO,
      debugMode: false,
      logToFile: false,
      showProgress: true,
      useColors: true,
      ...config
    };

    // Set log level based on debug mode
    if (this.config.debugMode) {
      this.config.level = LogLevel.DEBUG;
    }

    // Initialize log file if needed
    if (this.config.logToFile && this.config.logFilePath) {
      this.initializeLogFile();
    }

    this.startTime = performance.now();
  }

  /**
   * Initialize log file and directory
   */
  private initializeLogFile(): void {
    if (!this.config.logFilePath) return;

    const dir = dirname(this.config.logFilePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const header = `\n${'='.repeat(80)}\nLog Session Started: ${timestamp}\n${'='.repeat(80)}\n`;
    appendFileSync(this.config.logFilePath, header);
  }

  /**
   * Get color code for log level
   */
  private getColorCode(level: LogLevel): string {
    if (!this.config.useColors) return '';
    
    switch (level) {
      case LogLevel.ERROR: return '\x1b[31m'; // Red
      case LogLevel.WARN: return '\x1b[33m';  // Yellow
      case LogLevel.INFO: return '\x1b[36m';  // Cyan
      case LogLevel.DEBUG: return '\x1b[35m'; // Magenta
      case LogLevel.TRACE: return '\x1b[90m'; // Gray
      default: return '';
    }
  }

  /**
   * Reset color
   */
  private resetColor(): string {
    return this.config.useColors ? '\x1b[0m' : '';
  }

  /**
   * Format log message with timestamp and level
   */
  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level].padEnd(5);
    const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(3);
    
    let formatted = `[${timestamp}] [${levelName}] [+${elapsed}s] ${message}`;
    
    if (context) {
      formatted += '\n' + JSON.stringify(context, null, 2);
    }
    
    return formatted;
  }

  /**
   * Write log message to console and/or file
   */
  private writeLog(level: LogLevel, message: string, context?: any): void {
    if (level > this.config.level) return;

    // Clear progress indicator if active
    if (this.progressState?.active) {
      this.clearProgressIndicator();
    }

    const formatted = this.formatMessage(level, message, context);
    
    // Console output with colors
    const color = this.getColorCode(level);
    const reset = this.resetColor();
    
    if (level === LogLevel.ERROR) {
      console.error(`${color}${formatted}${reset}`);
    } else {
      console.log(`${color}${formatted}${reset}`);
    }

    // File output without colors
    if (this.config.logToFile && this.config.logFilePath) {
      appendFileSync(this.config.logFilePath, formatted + '\n');
    }

    // Resume progress indicator if it was active
    if (this.progressState?.active) {
      this.updateProgressIndicator();
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any): void {
    const context = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...error
    } : undefined;
    
    this.writeLog(LogLevel.ERROR, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: any): void {
    this.writeLog(LogLevel.WARN, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: any): void {
    this.writeLog(LogLevel.INFO, message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: any): void {
    this.writeLog(LogLevel.DEBUG, message, context);
  }

  /**
   * Log trace message
   */
  trace(message: string, context?: any): void {
    this.writeLog(LogLevel.TRACE, message, context);
  }

  /**
   * Start progress indicator
   */
  startProgress(message: string, total?: number): void {
    if (!this.config.showProgress) return;

    this.stopProgress();
    
    this.progressState = {
      active: true,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      message,
      current: 0,
      total: total || undefined
    };

    this.updateProgressIndicator();
    
    // Update progress every 100ms
    this.progressInterval = setInterval(() => {
      if (this.progressState?.active) {
        this.updateProgressIndicator();
      }
    }, 100);
  }

  /**
   * Update progress with current count
   */
  updateProgress(current: number, message?: string): void {
    if (!this.progressState) return;
    
    this.progressState.current = current;
    this.progressState.lastUpdate = Date.now();
    
    if (message) {
      this.progressState.message = message;
    }
    
    this.updateProgressIndicator();
  }

  /**
   * Stop progress indicator
   */
  stopProgress(finalMessage?: string): void {
    if (!this.progressState) return;

    this.clearProgressIndicator();
    
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    const elapsed = (Date.now() - this.progressState.startTime) / 1000;
    
    if (finalMessage) {
      this.info(`${finalMessage} (${elapsed.toFixed(1)}s)`);
    }

    this.progressState = null;
  }

  /**
   * Clear progress indicator from console
   */
  private clearProgressIndicator(): void {
    if (process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
  }

  /**
   * Update progress indicator display
   */
  private updateProgressIndicator(): void {
    if (!this.progressState || !process.stdout.isTTY) return;

    const elapsed = (Date.now() - this.progressState.startTime) / 1000;
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const frame = Math.floor(elapsed * 10) % spinner.length;
    
    let indicator = `${spinner[frame]} ${this.progressState.message}`;
    
    if (this.progressState.total && this.progressState.current !== undefined) {
      const percent = Math.round((this.progressState.current / this.progressState.total) * 100);
      const barLength = 30;
      const filled = Math.round(barLength * (this.progressState.current / this.progressState.total));
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
      indicator += ` [${bar}] ${percent}% (${this.progressState.current}/${this.progressState.total})`;
    } else {
      indicator += ` (${elapsed.toFixed(1)}s)`;
    }

    this.clearProgressIndicator();
    process.stdout.write(indicator);
  }

  /**
   * Format error for display
   */
  formatError(error: Error | any): string {
    if (error instanceof Error) {
      let message = `Error: ${error.message}`;
      
      if (this.config.debugMode && error.stack) {
        message += '\nStack Trace:\n' + error.stack;
      }
      
      return message;
    }
    
    return `Error: ${JSON.stringify(error, null, 2)}`;
  }

  /**
   * Log section header
   */
  section(title: string): void {
    const separator = '='.repeat(60);
    this.info(`\n${separator}\n${title}\n${separator}`);
  }

  /**
   * Log subsection header
   */
  subsection(title: string): void {
    const separator = '-'.repeat(40);
    this.info(`\n${separator}\n${title}\n${separator}`);
  }

  /**
   * Log success message with green color
   */
  success(message: string, context?: any): void {
    const color = this.config.useColors ? '\x1b[32m' : ''; // Green
    const reset = this.resetColor();
    const formatted = this.formatMessage(LogLevel.INFO, `✓ ${message}`, context);
    
    console.log(`${color}${formatted}${reset}`);
    
    if (this.config.logToFile && this.config.logFilePath) {
      appendFileSync(this.config.logFilePath, formatted + '\n');
    }
  }

  /**
   * Create a child logger with modified config
   */
  child(config: Partial<LoggerConfig>): Logger {
    return new Logger({
      ...this.config,
      ...config
    });
  }

  /**
   * Get elapsed time since logger creation
   */
  getElapsedTime(): number {
    return (performance.now() - this.startTime) / 1000;
  }
}

// Default logger instance
export const defaultLogger = new Logger();

/**
 * Create a configured logger instance
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}