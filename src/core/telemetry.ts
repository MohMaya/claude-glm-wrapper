import { join } from "path";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { homedir } from "os";
import type { TelemetryEvent } from "../types";
import { createLogger } from "./logger";

const logger = createLogger();

export interface TelemetryData {
  sessionId: string;
  sessionStart: number;
  requests: TelemetryRequest[];
  errors: TelemetryError[];
  fallbacks: TelemetryFallback[];
}

interface TelemetryRequest {
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
  timestamp: number;
  errorCode?: string;
}

interface TelemetryError {
  provider: string;
  error: string;
  count: number;
}

interface TelemetryFallback {
  fromProvider: string;
  toProvider: string;
  reason: string;
  timestamp: number;
}

export class Telemetry {
  private data: TelemetryData;
  private telemetryDir: string;
  private telemetryFile: string;
  private enabled: boolean = true;
  private static instance: Telemetry | null = null;

  private constructor() {
    this.telemetryDir = join(homedir(), ".config", "claude-glm");
    this.telemetryFile = join(this.telemetryDir, "telemetry.json");
    this.data = this.loadOrCreate();
  }

  static getInstance(): Telemetry {
    if (!Telemetry.instance) {
      Telemetry.instance = new Telemetry();
    }
    return Telemetry.instance;
  }

  private loadOrCreate(): TelemetryData {
    if (!existsSync(this.telemetryDir)) {
      return this.createNewSession();
    }

    try {
      if (existsSync(this.telemetryFile)) {
        const content = readFileSync(this.telemetryFile, "utf-8");
        const data = JSON.parse(content) as TelemetryData;
        const sessionAge = Date.now() - data.sessionStart;
        const ONE_DAY = 24 * 60 * 60 * 1000;

        if (sessionAge > ONE_DAY) {
          return this.createNewSession();
        }
        return data;
      }
    } catch (error) {
      logger.warn("Failed to load telemetry data", { error: (error as Error).message });
    }

    return this.createNewSession();
  }

  private createNewSession(): TelemetryData {
    return {
      sessionId: this.generateSessionId(),
      sessionStart: Date.now(),
      requests: [],
      errors: [],
      fallbacks: []
    };
  }

  private generateSessionId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
  }

  private save(): void {
    try {
      writeFileSync(this.telemetryFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      logger.warn("Failed to save telemetry data", { error: (error as Error).message });
    }
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  trackRequest(
    provider: string,
    model: string,
    latencyMs: number,
    success: boolean,
    errorCode?: string
  ): void {
    if (!this.enabled) return;

    const request: TelemetryRequest = {
      provider,
      model,
      latencyMs,
      success,
      timestamp: Date.now()
    };

    if (errorCode) {
      request.errorCode = errorCode;
      this.trackError(provider, errorCode);
    }

    this.data.requests.push(request);
    this.save();
  }

  private trackError(provider: string, error: string): void {
    const existing = this.data.errors.find(e => e.provider === provider && e.error === error);
    if (existing) {
      existing.count++;
    } else {
      this.data.errors.push({ provider, error, count: 1 });
    }
  }

  trackFallback(fromProvider: string, toProvider: string, reason: string): void {
    if (!this.enabled) return;

    this.data.fallbacks.push({
      fromProvider,
      toProvider,
      reason,
      timestamp: Date.now()
    });
    this.save();
  }

  trackEvent(event: Omit<TelemetryEvent, "timestamp">): void {
    if (!this.enabled) return;

    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: Date.now()
    };

    switch (event.type) {
      case "request_complete":
        if (event.provider && event.model && event.latencyMs !== undefined) {
          this.trackRequest(
            event.provider,
            event.model,
            event.latencyMs,
            event.success ?? true,
            event.errorCode
          );
        }
        break;
      case "fallback":
        if (event.fromProvider && event.toProvider) {
          this.trackFallback(event.fromProvider, event.toProvider, event.reason || "unknown");
        }
        break;
    }
  }

  getSessionId(): string {
    return this.data.sessionId;
  }

  getSessionStart(): number {
    return this.data.sessionStart;
  }

  getRequestCount(): number {
    return this.data.requests.length;
  }

  getRequests(): TelemetryRequest[] {
    return [...this.data.requests];
  }

  getErrors(): TelemetryError[] {
    return [...this.data.errors];
  }

  getFallbacks(): TelemetryFallback[] {
    return [...this.data.fallbacks];
  }

  getProviderStats(): Record<string, { count: number; avgLatency: number; errors: number }> {
    const stats: Record<string, { count: number; totalLatency: number; errors: number }> = {};

    for (const request of this.data.requests) {
      if (!stats[request.provider]) {
        stats[request.provider] = { count: 0, totalLatency: 0, errors: 0 };
      }
      const providerStats = stats[request.provider];
      if (providerStats) {
        providerStats.count++;
        providerStats.totalLatency += request.latencyMs;
        if (!request.success) {
          providerStats.errors++;
        }
      }
    }

    const result: Record<string, { count: number; avgLatency: number; errors: number }> = {};
    for (const [provider, stat] of Object.entries(stats)) {
      result[provider] = {
        count: stat.count,
        avgLatency: Math.round(stat.totalLatency / stat.count),
        errors: stat.errors
      };
    }

    return result;
  }

  getSessionDuration(): number {
    return Date.now() - this.data.sessionStart;
  }

  clear(): void {
    this.data = this.createNewSession();
    this.save();
  }
}

export const telemetry = Telemetry.getInstance();
