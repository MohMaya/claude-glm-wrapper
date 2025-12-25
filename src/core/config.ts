import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync } from "fs";

export interface Config {
  zaiApiKey?: string;
  minimaxApiKey?: string;
  providers: {
    openai?: { apiKey: string; baseUrl?: string };
    openrouter?: { apiKey: string; baseUrl?: string; referer?: string; title?: string };
    gemini?: { apiKey: string; baseUrl?: string };
    anthropic?: { apiKey: string; baseUrl?: string };
  };
  defaults: {
    model: string; // e.g., "glm-4.7"
    provider: string; // e.g., "glm"
  };
  aliases: boolean; // whether to install aliases
}

const DEFAULT_CONFIG: Config = {
  providers: {},
  defaults: {
    model: "glm-4.7",
    provider: "glm",
  },
  aliases: false,
};

export class ConfigManager {
  private configDir: string;
  private configFile: string;

  constructor() {
    const home = homedir();
    // Use XDG config standard if possible, but fallback to ~/.config
    this.configDir = join(home, ".config", "claude-glm");
    this.configFile = join(this.configDir, "config.json");
  }

  ensureConfigDir() {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
  }

  async read(): Promise<Config> {
    let config = { ...DEFAULT_CONFIG };
    
    // 1. Read from file
    try {
      const file = Bun.file(this.configFile);
      if (await file.exists()) {
        const json = await file.json();
        config = { ...config, ...json };
      }
    } catch (e) {
      // ignore error
    }

    // 2. Env Var Fallback (Auto-Discovery)
    if (!config.zaiApiKey && process.env.ZAI_API_KEY) {
        config.zaiApiKey = process.env.ZAI_API_KEY;
    }
    if (!config.zaiApiKey && process.env.GLM_API_KEY) {
        config.zaiApiKey = process.env.GLM_API_KEY;
    }
    
    if (!config.minimaxApiKey && process.env.MINIMAX_API_KEY) {
        config.minimaxApiKey = process.env.MINIMAX_API_KEY;
    }

    if (!config.providers.openai?.apiKey && process.env.OPENAI_API_KEY) {
        config.providers.openai = { 
            apiKey: process.env.OPENAI_API_KEY,
            baseUrl: process.env.OPENAI_BASE_URL
        };
    }

    if (!config.providers.anthropic?.apiKey && process.env.ANTHROPIC_API_KEY) {
        config.providers.anthropic = {
            apiKey: process.env.ANTHROPIC_API_KEY,
            baseUrl: process.env.ANTHROPIC_BASE_URL
        };
    }
    
    if (!config.providers.gemini?.apiKey && process.env.GEMINI_API_KEY) {
        config.providers.gemini = { apiKey: process.env.GEMINI_API_KEY };
    }

    if (!config.providers.openrouter?.apiKey && process.env.OPENROUTER_API_KEY) {
        config.providers.openrouter = { 
            apiKey: process.env.OPENROUTER_API_KEY,
            baseUrl: process.env.OPENROUTER_BASE_URL,
            referer: process.env.OPENROUTER_REFERER,
            title: process.env.OPENROUTER_TITLE
        };
    }

    return config;
  }

  async write(config: Config) {
    this.ensureConfigDir();
    await Bun.write(this.configFile, JSON.stringify(config, null, 2));
  }

  getPath() {
    return this.configFile;
  }
}
