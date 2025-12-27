import type { LogLevel } from "../types";

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

export interface LogContext {
  requestId?: string;
  provider?: string;
  model?: string;
  port?: number;
  command?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  time: string;
  msg: string;
  requestId?: string;
  provider?: string;
  model?: string;
  port?: number;
  command?: string;
  error?: string;
  stack?: string;
  [key: string]: unknown;
}

export class Logger {
  private level: LogLevel = "info";
  private jsonMode: boolean = false;
  private requestId: string | null = null;

  constructor(options?: { level?: LogLevel; jsonMode?: boolean }) {
    if (options?.level) this.level = options.level;
    if (options?.jsonMode) this.jsonMode = options.jsonMode;
    if (process.env.CCX_LOG_LEVEL) {
      const envLevel = process.env.CCX_LOG_LEVEL as LogLevel;
      if (LOG_LEVELS.includes(envLevel)) {
        this.level = envLevel;
      }
    }
    if (process.env.CCX_JSON_LOG === "1" || process.env.CCX_JSON_LOG === "true") {
      this.jsonMode = true;
    }
  }

  setJsonMode(enabled: boolean): void {
    this.jsonMode = enabled;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setRequestId(id: string): void {
    this.requestId = id;
  }

  clearRequestId(): void {
    this.requestId = null;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(this.level);
  }

  private formatLog(entry: LogEntry): string {
    if (this.jsonMode) {
      return JSON.stringify(entry);
    }

    const timeParts = entry.time.split("T");
    const timestamp = timeParts[1]?.split(".")[0] || "00:00:00";
    const parts = [timestamp];

    const levelColors: Record<LogLevel, string> = {
      debug: "\x1b[90m",
      info: "\x1b[36m",
      warn: "\x1b[33m",
      error: "\x1b[31m",
    };
    const reset = "\x1b[0m";

    parts.push(`${levelColors[entry.level]}[${entry.level.toUpperCase()}]${reset}`);

    if (entry.provider) {
      parts.push(`[${entry.provider}]`);
    }

    parts.push(entry.msg);

    const contextParts: string[] = [];
    if (entry.requestId) contextParts.push(`req=${entry.requestId}`);
    if (entry.model) contextParts.push(`model=${entry.model}`);
    if (entry.port) contextParts.push(`port=${entry.port}`);

    if (contextParts.length > 0) {
      parts.push(`\x1b[90m${contextParts.join(" ")}${reset}`);
    }

    if (entry.error) {
      parts.push(`\x1b[31m${entry.error}${reset}`);
    }

    return parts.join(" ");
  }

  private createEntry(
    level: LogLevel,
    msg: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      time: new Date().toISOString(),
      msg,
    };

    if (this.requestId) {
      entry.requestId = this.requestId;
    }

    if (context) {
      if (context.requestId && !entry.requestId) {
        entry.requestId = context.requestId;
      }
      if (context.provider) entry.provider = context.provider;
      if (context.model) entry.model = context.model;
      if (context.port) entry.port = context.port;
      if (context.command) entry.command = context.command;

      for (const [key, value] of Object.entries(context)) {
        if (!["requestId", "provider", "model", "port", "command"].includes(key)) {
          entry[key] = value;
        }
      }
    }

    if (error) {
      entry.error = error.message;
      entry.stack = error.stack;
    }

    return entry;
  }

  debug(msg: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog("debug")) return;
    console.log(this.formatLog(this.createEntry("debug", msg, context, error)));
  }

  info(msg: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog("info")) return;
    console.log(this.formatLog(this.createEntry("info", msg, context, error)));
  }

  warn(msg: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog("warn")) return;
    console.warn(this.formatLog(this.createEntry("warn", msg, context, error)));
  }

  error(msg: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog("error")) return;
    console.error(this.formatLog(this.createEntry("error", msg, context, error)));
  }
}

export function createLogger(options?: { level?: LogLevel; jsonMode?: boolean }): Logger {
  return new Logger(options);
}

export const defaultLogger = createLogger();
