import type {
  ProviderPlugin,
  ProviderClient,
  PluginConfig,
  ModelInfo,
  HealthStatus,
  SSEMessage,
  AnthropicRequest
} from "../../../packages/plugin-types/index";

const MODELS: ModelInfo[] = [
  { id: "llama3.1", name: "Llama 3.1 8B", contextWindow: 131072 },
  { id: "qwen2.5", name: "Qwen 2.5 72B", contextWindow: 131072 },
  { id: "mistral", name: "Mistral 7B", contextWindow: 32768 },
  { id: "codellama", name: "CodeLlama 7B", contextWindow: 16384 },
  { id: "deepseek-coder", name: "DeepSeek Coder 6.7B", contextWindow: 16384 }
];

export default {
  id: "ollama",
  name: "Ollama (Local)",
  version: "1.0.0",
  description: "Run local Ollama models with Claude Code",
  models: MODELS,

  createClient(config: PluginConfig): ProviderClient {
    return new OllamaClient(config);
  }
} satisfies ProviderPlugin;

class OllamaClient implements ProviderClient {
  readonly provider = "ollama";
  private baseUrl: string;

  constructor(config: PluginConfig) {
    this.baseUrl = config.baseUrl || "http://localhost:11434";
  }

  async *streamComplete(request: AnthropicRequest): AsyncGenerator<SSEMessage> {
    const prompt = this.buildPrompt(request);

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        prompt,
        stream: true,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.max_tokens
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama error: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body from Ollama");

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);

          if (data.response) {
            yield {
              type: "content_block_delta",
              data: { text: data.response }
            };
          }

          if (data.done) {
            yield {
              type: "message_delta",
              data: { stop_reason: "end_turn" }
            };
            yield {
              type: "message_stop",
              data: {}
            };
            break;
          }
        } catch {
          continue;
        }
      }
    }
  }

  getModelInfo(): ModelInfo | undefined {
    return MODELS.find(m => m.id === "llama3.1");
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const start = Date.now();
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        return { healthy: false, error: `HTTP ${response.status}` };
      }
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { healthy: false, error: (error as Error).message };
    }
  }

  private buildPrompt(request: AnthropicRequest): string {
    const parts: string[] = [];

    if (request.system) {
      parts.push(`<system>${request.system}</system>`);
    }

    for (const message of request.messages) {
      const role = message.role === "assistant" ? "assistant" : "user";
      const content = typeof message.content === "string"
        ? message.content
        : message.content.map(c => c.type === "text" ? c.text : "").join("");
      parts.push(`<${role}>${content}</${role}>`);
    }

    return parts.join("\n");
  }
}
