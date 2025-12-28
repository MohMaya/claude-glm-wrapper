import { providerRegistry } from "../core/registry";
import { createLogger } from "../core/logger";

const logger = createLogger();

export async function modelsCommand(): Promise<void> {
  console.log("\n");

  const providers = providerRegistry.listProviders();
  const allModels = providerRegistry.getAllModels();

  const maxProviderWidth = Math.max(
    ...providers.map(p => p.name.length)
  );
  const maxModelWidth = Math.max(
    ...allModels.map(m => `${m.provider.id}:${m.model.id}`.length),
    30
  );

  console.log("╔" + "═".repeat(maxProviderWidth + maxModelWidth + 7) + "╗");
  console.log("║" + " ".repeat(Math.floor((maxProviderWidth + maxModelWidth + 7 - 26) / 2)) + "ccx Available Models" + " ".repeat(Math.ceil((maxProviderWidth + maxModelWidth + 7 - 26) / 2)) + "║");
  console.log("╠" + "═".repeat(maxProviderWidth + maxModelWidth + 7) + "╣");

  for (const provider of providers) {
    const statusIcon = provider.isNative ? "🔵" : "🟢";
    const keyHint = provider.isNative ? "[Native - No proxy needed]" : `[Requires: ${provider.requiresKey.split(".").pop()?.replace("ApiKey", "_KEY") || "key"}]`;

    console.log("║");
    console.log(`║  ${statusIcon} ${provider.name.padEnd(maxProviderWidth)} ${keyHint}`);

    for (const model of provider.models) {
      const defaultMark = model.default ? " (default)" : "";
      const modelLine = `  ├── ${model.id}${defaultMark}`;
      console.log(`║  ${modelLine.padEnd(maxProviderWidth + maxModelWidth + 3)}║`);
    }
  }

  console.log("║");
  console.log("╚" + "═".repeat(maxProviderWidth + maxModelWidth + 7) + "╝");
  console.log("\n");
  console.log("Usage:");
  console.log("  ccx                    # Interactive selection");
  console.log("  ccx --model=glm-4.7    # Use specific model");
  console.log("  ccx --list             # Show this list");
  console.log("  ccx setup              # Configure API keys");
  console.log("\n");
}
