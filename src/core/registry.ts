import type { ProviderInfo, ModelInfo } from "../types";

const BUILTIN_PROVIDERS: ProviderInfo[] = [
  {
    id: "glm",
    name: "GLM (Z.AI)",
    models: [
      { id: "glm-4.7", name: "GLM-4.7", default: true },
      { id: "glm-4.6", name: "GLM-4.6" },
      { id: "glm-4.5", name: "GLM-4.5" },
      { id: "glm-4.5-air", name: "GLM-4.5-Air" }
    ],
    isNative: false,
    requiresKey: "zaiApiKey"
  },
  {
    id: "minimax",
    name: "Minimax",
    models: [
      { id: "MiniMax-M2.1", name: "MiniMax-M2.1", default: true },
      { id: "MiniMax-M2.1-32k", name: "MiniMax-M2.1-32k" }
    ],
    isNative: false,
    requiresKey: "minimaxApiKey"
  },
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o", default: true },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" }
    ],
    isNative: false,
    requiresKey: "providers.openai.apiKey"
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude Code)",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", default: true },
      { id: "claude-haiku-4-20250514", name: "Claude Haiku 4" },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4" }
    ],
    isNative: true,
    requiresKey: "providers.anthropic.apiKey"
  },
  {
    id: "gemini",
    name: "Google Gemini",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", default: true },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" }
    ],
    isNative: false,
    requiresKey: "providers.gemini.apiKey"
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    models: [
      { id: "openrouter.auto", name: "Auto-Select", default: true },
      { id: "anthropic/claude-sonnet-4", name: "Anthropic Sonnet" }
    ],
    isNative: false,
    requiresKey: "providers.openrouter.apiKey"
  }
];

const DEFAULT_PROVIDER_ORDER = ["glm", "minimax", "openai", "gemini", "openrouter", "anthropic"];

export class ProviderRegistry {
  private providers: Map<string, ProviderInfo> = new Map();
  private plugins: Map<string, ProviderInfo> = new Map();

  constructor() {
    for (const provider of BUILTIN_PROVIDERS) {
      this.providers.set(provider.id, provider);
    }
  }

  registerPlugin(plugin: ProviderInfo): void {
    this.plugins.set(plugin.id, plugin);
  }

  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  listProviders(): ProviderInfo[] {
    const all: ProviderInfo[] = [];
    for (const id of DEFAULT_PROVIDER_ORDER) {
      const builtin = this.providers.get(id);
      const plugin = this.plugins.get(id);
      if (builtin) all.push(builtin);
      if (plugin) all.push(plugin);
    }
    for (const [id, plugin] of this.plugins) {
      if (!DEFAULT_PROVIDER_ORDER.includes(id)) {
        all.push(plugin);
      }
    }
    return all;
  }

  getProvider(id: string): ProviderInfo | null {
    return this.providers.get(id) || this.plugins.get(id) || null;
  }

  getProviderOrder(): string[] {
    const order: string[] = [];
    for (const id of DEFAULT_PROVIDER_ORDER) {
      if (this.providers.has(id) || this.plugins.has(id)) {
        order.push(id);
      }
    }
    for (const id of this.plugins.keys()) {
      if (!DEFAULT_PROVIDER_ORDER.includes(id) && !order.includes(id)) {
        order.push(id);
      }
    }
    return order;
  }

  getDefaultProvider(): ProviderInfo | null {
    const order = this.getProviderOrder();
    for (const id of order) {
      const provider = this.getProvider(id);
      if (provider) {
        const defaultModel = provider.models.find(m => m.default);
        if (defaultModel) {
          return provider;
        }
      }
    }
    return null;
  }

  getDefaultModelForProvider(providerId: string): ModelInfo | null {
    const provider = this.getProvider(providerId);
    if (!provider) return null;
    return provider.models.find(m => m.default) || provider.models[0] || null;
  }

  getModel(providerId: string, modelId: string): ModelInfo | null {
    const provider = this.getProvider(providerId);
    if (!provider) return null;
    return provider.models.find(m => m.id === modelId) || null;
  }

  getAllModels(): Array<{ provider: ProviderInfo; model: ModelInfo }> {
    const all: Array<{ provider: ProviderInfo; model: ModelInfo }> = [];
    for (const provider of this.listProviders()) {
      for (const model of provider.models) {
        all.push({ provider, model });
      }
    }
    return all;
  }

  isNative(providerId: string): boolean {
    const provider = this.getProvider(providerId);
    return provider?.isNative ?? false;
  }

  requiresKey(providerId: string): string | null {
    const provider = this.getProvider(providerId);
    return provider?.requiresKey ?? null;
  }
}

export const providerRegistry = new ProviderRegistry();
