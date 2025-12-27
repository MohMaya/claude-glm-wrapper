import { join, dirname } from "path";
import { existsSync, readdirSync, readFileSync } from "fs";
import { homedir } from "os";
import type { ProviderPlugin, ProviderInfo } from "../types";
import { providerRegistry } from "./registry";
import { createLogger } from "./logger";

const logger = createLogger();

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  entry: string;
}

export class PluginManager {
  private plugins: Map<string, ProviderPlugin> = new Map();
  private pluginDir: string;
  private static instance: PluginManager | null = null;

  private constructor() {
    this.pluginDir = join(homedir(), ".config", "claude-glm", "plugins");
  }

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  async discoverAndLoad(): Promise<void> {
    if (!existsSync(this.pluginDir)) {
      logger.debug("Plugin directory does not exist", { path: this.pluginDir });
      return;
    }

    const entries = readdirSync(this.pluginDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const pluginPath = join(this.pluginDir, entry.name);
      await this.loadPlugin(pluginPath);
    }

    logger.info("Plugin discovery complete", { count: this.plugins.size });
  }

  private async loadPlugin(pluginPath: string): Promise<void> {
    const manifestPath = join(pluginPath, "plugin.json");

    if (!existsSync(manifestPath)) {
      logger.warn("Plugin missing manifest", { path: pluginPath });
      return;
    }

    let manifest: PluginManifest;
    try {
      const content = readFileSync(manifestPath, "utf-8");
      manifest = JSON.parse(content);
    } catch (error) {
      logger.warn("Failed to parse plugin manifest", { error: (error as Error).message });
      return;
    }

    if (!manifest.id || !manifest.entry) {
      logger.warn("Plugin manifest incomplete", { manifest });
      return;
    }

    const entryPath = join(pluginPath, manifest.entry);
    if (!existsSync(entryPath)) {
      logger.warn("Plugin entry file not found", { entry: manifest.entry });
      return;
    }

    try {
      const pluginModule = await import(entryPath);
      const plugin = pluginModule.default as ProviderPlugin;

      if (!plugin.id || !plugin.name || !plugin.models || !plugin.createClient) {
        logger.warn("Plugin missing required fields", { id: plugin.id });
        return;
      }

      this.plugins.set(plugin.id, plugin);
      providerRegistry.registerPlugin({
        id: plugin.id,
        name: plugin.name,
        models: plugin.models,
        isNative: false,
        requiresKey: `plugins.${plugin.id}.apiKey`
      });

      logger.info("Plugin loaded", { id: plugin.id, name: plugin.name, version: plugin.version });
    } catch (error) {
      logger.warn("Failed to load plugin", { id: manifest.id, error: (error as Error).message });
    }
  }

  getPlugins(): ProviderPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(id: string): ProviderPlugin | undefined {
    return this.plugins.get(id);
  }

  isPluginLoaded(id: string): boolean {
    return this.plugins.has(id);
  }

  async unloadPlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    if (typeof (plugin as unknown as { onUnload?: () => Promise<void> }).onUnload === "function") {
      try {
        await (plugin as unknown as { onUnload: () => Promise<void> }).onUnload();
      } catch (error) {
        logger.warn("Plugin onUnload failed", { id, error: (error as Error).message });
      }
    }

    this.plugins.delete(id);
    providerRegistry.unregisterPlugin(id);
    logger.info("Plugin unloaded", { id });
  }

  getPluginCount(): number {
    return this.plugins.size;
  }
}

export const pluginManager = PluginManager.getInstance();
