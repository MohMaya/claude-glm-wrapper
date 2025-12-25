import { AnthropicMessage, AnthropicRequest, ProviderKey, ProviderModel } from "./types";

const PROVIDER_PREFIXES: ProviderKey[] = ["openai", "openrouter", "gemini", "glm", "anthropic", "minimax"];

const PROVIDER_ALIASES: Record<string, ProviderKey> = {
    "gpt": "openai",
    "gpt4": "openai",
    "oai": "openai",
    "or": "openrouter",
    "router": "openrouter",
    "google": "gemini",
    "bard": "gemini",
    "ant": "anthropic",
    "sonnet": "anthropic",
    "claude": "anthropic",
    "z": "glm",
    "zai": "glm",
    "mini": "minimax",
    "mm": "minimax"
};

export function parseProviderModel(modelField: string, defaults?: ProviderModel): ProviderModel {
  if (!modelField) {
    if (defaults) return defaults;
    throw new Error("Missing 'model' in request");
  }

  const sep = modelField.includes(":") ? ":" : modelField.includes("/") ? "/" : null;
  if (!sep) {
    // Try to auto-detect common model names without prefix
    const lower = modelField.toLowerCase();
    if (lower.startsWith("gpt")) return { provider: "openai", model: modelField };
    if (lower.startsWith("gemini")) return { provider: "gemini", model: modelField };
    if (lower.startsWith("claude")) return { provider: "anthropic", model: modelField };
    if (lower.startsWith("glm")) return { provider: "glm", model: modelField };
    if (lower.startsWith("minimax")) return { provider: "minimax", model: modelField };

    return defaults ?? { provider: "glm", model: modelField };
  }

  const [maybeProv, ...rest] = modelField.split(sep);
  let prov = maybeProv.toLowerCase();

  // Resolve alias
  if (PROVIDER_ALIASES[prov]) {
      prov = PROVIDER_ALIASES[prov];
  }

  if (!PROVIDER_PREFIXES.includes(prov as ProviderKey)) {
    // If prefix unknown, treat whole string as model for default provider
    return defaults ?? { provider: "glm", model: modelField };
  }

  return { provider: prov as ProviderKey, model: rest.join(sep) };
}

export function toPlainText(content: AnthropicMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .map((c) => {
      if (typeof c === "string") return c;
      if (c.type === "text") return c.text;
      // @ts-ignore
      if (c.type === "tool_result") {
        // @ts-ignore
        if (typeof c.content === "string") return c.content;
        // @ts-ignore
        return JSON.stringify(c.content);
      }
      return "";
    })
    .join("");
}

export function toOpenAIMessages(messages: AnthropicMessage[]) {
  return messages.map((m) => ({
    role: m.role,
    content: toPlainText(m.content)
  }));
}

export function toGeminiContents(messages: AnthropicMessage[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: toPlainText(m.content) }]
  }));
}
