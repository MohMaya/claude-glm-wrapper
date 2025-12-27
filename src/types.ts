export type LogLevel = "debug" | "info" | "warn" | "error";

export interface TelemetryEvent {
  type: string;
  timestamp: number;
  provider?: string;
  model?: string;
  latencyMs?: number;
  success?: boolean;
  errorCode?: string;
  reason?: string;
  fromProvider?: string;
  toProvider?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: ModelInfo[];
  isNative: boolean;
  requiresKey: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  capabilities?: readonly ("text" | "vision" | "tools")[];
  default?: boolean;
}

export interface CircuitState {
  provider: string;
  state: "closed" | "open" | "half-open";
  failures: number;
  lastFailure: number | null;
}

export interface HealthStatus {
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}

export interface PluginConfig {
  apiKey?: string;
  baseUrl: string;
  extra?: Record<string, unknown>;
}

export interface ProviderClient {
  readonly provider: string;
  streamComplete(request: object): AsyncGenerator<object>;
  getModelInfo(): ModelInfo | undefined;
  healthCheck(): Promise<HealthStatus>;
}

export interface ProviderPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  models: ModelInfo[];
  createClient(config: PluginConfig): ProviderClient;
}

export interface SSEMessage {
  type: string;
  data: unknown;
}
