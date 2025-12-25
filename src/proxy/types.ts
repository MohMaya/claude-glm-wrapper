export type ProviderKey = "openai" | "openrouter" | "gemini" | "glm" | "anthropic" | "minimax";

export interface ProviderModel {
  provider: ProviderKey;
  model: string;
}

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "tool_result"; content: string | any }>;
}

export interface AnthropicRequest {
  model: string; // "provider:model" or just "model"
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  system?: string;
  tools?: any[];
  stream?: boolean;
}
