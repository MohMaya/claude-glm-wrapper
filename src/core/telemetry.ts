import { join } from "path";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { homedir } from "os";

export interface TelemetryData {
  sessionId: string;
  sessionStart: number;
  requests: TelemetryRequest[];
}

interface TelemetryRequest {
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
  timestamp: number;
  errorCode?: string;
}

export class Telemetry {
  private data: TelemetryData;
  private telemetryDir: string;
  private telemetryFile: string;
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
      console.warn("[Telemetry] Failed to load data:", (error as Error).message);
    }

    return this.createNewSession();
  }

  private createNewSession(): TelemetryData {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return {
      sessionId: Array.from(array, byte => byte.toString(16).padStart(2, "0")).join(""),
      sessionStart: Date.now(),
      requests: []
    };
  }

  private save(): void {
    try {
      writeFileSync(this.telemetryFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.warn("[Telemetry] Failed to save:", (error as Error).message);
    }
  }

  trackRequest(
    provider: string,
    model: string,
    latencyMs: number,
    success: boolean,
    errorCode?: string
  ): void {
    const request: TelemetryRequest = {
      provider,
      model,
      latencyMs,
      success,
      timestamp: Date.now(),
      errorCode
    };

    this.data.requests.push(request);
    this.save();
  }

  getStats(): { total: number; successful: number; failed: number } {
    const requests = this.data.requests;
    return {
      total: requests.length,
      successful: requests.filter(r => r.success).length,
      failed: requests.filter(r => !r.success).length
    };
  }

  getProviderStats(): Record<string, { count: number; errors: number }> {
    const stats: Record<string, { count: number; errors: number }> = {};
    
    for (const request of this.data.requests) {
      if (!stats[request.provider]) {
        stats[request.provider] = { count: 0, errors: 0 };
      }
      const providerStat = stats[request.provider];
      if (providerStat) {
          providerStat.count++;
          if (!request.success) {
            providerStat.errors++;
          }
      }
    }
    
    return stats;
  }
}

export const telemetry = Telemetry.getInstance();
