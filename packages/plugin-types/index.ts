export interface ProviderPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly models: ModelInfo[];

  createClient(config: PluginConfig): ProviderClient;
}

export interface ModelInfo {
  readonly id: string;
  readonly name: string;
  readonly contextWindow?: number;
  readonly maxOutputTokens?: number;
  readonly capabilities?: readonly ("text" | "vision" | "tools")[];
  readonly default?: boolean;
}

export interface ProviderClient {
  readonly provider: string;

  streamComplete(request: AnthropicRequest): AsyncGenerator<SSEMessage>;

  getModelInfo(): ModelInfo | undefined;

  healthCheck(): Promise<HealthStatus>;
}

export interface PluginConfig {
  readonly apiKey?: string;
  readonly baseUrl: string;
  readonly extra?: Record<string, unknown>;
}

export interface HealthStatus {
  readonly healthy: boolean;
  readonly latencyMs?: number;
  readonly error?: string;
}

export interface SSEMessage {
  type: string;
  data: unknown;
}

export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  system?: string;
  tools?: unknown[];
  stream?: boolean;
}

export interface AnthropicMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: "text"; text: string } | { type: "tool_result"; content: string | unknown }>;
}
