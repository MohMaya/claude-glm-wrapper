import { intro, outro, spinner } from "@clack/prompts";
import { ShellIntegrator } from "../core/shell";
import { ConfigManager } from "../core/config";
import { telemetry } from "../core/telemetry";
import { circuitBreaker } from "../core/circuit-breaker";
import { pluginManager } from "../core/plugins";
import * as pc from "picocolors";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export async function doctorCommand() {
  intro(pc.bgBlue(pc.white(" ccx Doctor 🩺 ")));

  const s = spinner();
  const issues: string[] = [];
  const warnings: string[] = [];
  const checks: string[] = [];
  const home = homedir();

  // 1. Check for old/shadowing binaries
  s.start("Checking for conflicting binaries...");
  const oldLocations = [
    join(home, ".local", "bin", "ccx"),
    join(home, ".npm-global", "bin", "ccx"),
    join(home, "bin", "ccx"),
  ];

  const foundOld: string[] = [];
  for (const loc of oldLocations) {
    if (existsSync(loc)) foundOld.push(loc);
  }

  if (foundOld.length > 0) {
    issues.push("❌ Old ccx binaries found that may shadow the new one:");
    for (const p of foundOld) {
      issues.push(`   ${p}`);
    }
    issues.push("   👉 Run 'ccx update' to remove them automatically");
  } else {
    checks.push("✅ No conflicting binaries");
  }
  s.stop("Binary check complete");

  // 2. Check PATH priority
  s.start("Checking PATH configuration...");
  const shellInt = new ShellIntegrator();

  if (!shellInt.isBunBinFirst()) {
    warnings.push("⚠️  ~/.bun/bin is not first in PATH");
    warnings.push("   This may cause the wrong ccx to run.");
    warnings.push('   👉 Add to TOP of your shell config: export PATH="$HOME/.bun/bin:$PATH"');
  } else {
    checks.push("✅ PATH is correctly configured");
  }
  s.stop("PATH check complete");

  // 3. Check Config
  s.start("Checking configuration...");
  const configManager = new ConfigManager();
  const config = await configManager.read();

  if (!config.zaiApiKey && !config.minimaxApiKey && Object.keys(config.providers).length === 0) {
    issues.push("❌ No API keys configured. Run 'ccx setup'.");
  } else {
    const keys: string[] = [];
    if (config.zaiApiKey) keys.push("Z.AI");
    if (config.minimaxApiKey) keys.push("Minimax");
    if (config.providers.openai?.apiKey) keys.push("OpenAI");
    if (config.providers.gemini?.apiKey) keys.push("Gemini");
    checks.push(`✅ API keys configured: ${keys.join(", ")}`);
  }
  s.stop("Configuration check complete");

  // 4. Check Claude Binary
  s.start("Checking Claude Code installation...");
  const claudePath = await shellInt.findClaudeBinary();

  if (claudePath) {
    checks.push(`✅ Claude binary: ${claudePath}`);
  } else {
    issues.push("❌ 'claude' command not found.");
    issues.push("   👉 Run: npm install -g @anthropic-ai/claude-code");
  }
  s.stop("Claude check complete");

  // 5. Check Shell Integration
  s.start("Checking shell integration...");
  const shell = shellInt.detectShell();
  const profile = shellInt.getProfilePath(shell);

  if (shell === "unknown") {
    warnings.push("⚠️  Could not detect shell type.");
  } else {
    checks.push(`✅ Shell: ${shell}`);
    if (profile && existsSync(profile)) {
      const content = await Bun.file(profile).text();
      if (content.includes("claude-glm-wrapper")) {
        if (content.includes("bunx cc-x10ded")) {
          warnings.push("⚠️  Old bunx-based aliases detected");
          warnings.push("   👉 Run 'ccx update' to migrate to faster direct aliases");
        } else {
          checks.push("✅ Aliases installed (new format)");
        }
      } else {
        warnings.push(`⚠️  Aliases missing. Run 'ccx setup' to install.`);
      }
    }
  }
  s.stop("Shell check complete");

  // 6. Telemetry (Local)
  s.start("Checking telemetry...");
  const sessionDuration = telemetry.getSessionDuration();
  const requestCount = telemetry.getRequestCount();
  const providerStats = telemetry.getProviderStats();
  const errors = telemetry.getErrors();
  const fallbacks = telemetry.getFallbacks();

  console.log("\n" + pc.bold("Telemetry (this session):"));
  console.log(`  Session: ${Math.round(sessionDuration / 1000)}s | Requests: ${requestCount}`);

  if (Object.keys(providerStats).length > 0) {
    console.log("\n  Provider Usage:");
    for (const [provider, stats] of Object.entries(providerStats)) {
      const statusIcon = stats.errors > 0 ? "🔴" : "🟢";
      console.log(`  ${statusIcon} ${provider}: ${stats.count} requests (avg ${stats.avgLatency}ms)${stats.errors > 0 ? `, ${stats.errors} errors` : ""}`);
    }
  }

  if (errors.length > 0) {
    console.log("\n  Errors:");
    for (const error of errors) {
      console.log(`    ${error.provider}: ${error.error} (${error.count})`);
    }
  }

  if (fallbacks.length > 0) {
    console.log("\n  Fallbacks:");
    for (const fallback of fallbacks) {
      console.log(`    ${fallback.fromProvider} → ${fallback.toProvider} (${fallback.reason})`);
    }
  }

  if (requestCount === 0) {
    console.log("  No requests yet in this session.");
  }
  s.stop("Telemetry check complete");

  // 7. Circuit Breaker Status
  s.start("Checking circuit breaker...");
  const circuitStates = circuitBreaker.getStates();
  if (circuitStates.length > 0) {
    console.log("\n" + pc.bold("Circuit Breaker Status:"));
    for (const state of circuitStates) {
      const icon = state.state === "closed" ? "🟢" : state.state === "half-open" ? "🟡" : "🔴";
      console.log(`  ${icon} ${state.provider}: ${state.state} (${state.failures} failures)`);
    }
  } else {
    console.log("  No circuit breaker activity yet.");
  }
  s.stop("Circuit breaker check complete");

  // 8. Plugins
  s.start("Checking plugins...");
  const pluginCount = pluginManager.getPluginCount();
  if (pluginCount > 0) {
    const plugins = pluginManager.getPlugins();
    console.log(`\n  Installed Plugins: ${pluginCount}`);
    for (const plugin of plugins) {
      console.log(`    - ${plugin.name} v${plugin.version}`);
    }
  } else {
    console.log("  No plugins installed.");
  }
  s.stop("Plugin check complete");

  // Report
  console.log("\n" + pc.bold("Diagnostic Report:"));
  for (const c of checks) {
    console.log(c);
  }

  if (warnings.length > 0) {
    console.log("");
    for (const w of warnings) {
      console.log(pc.yellow(w));
    }
  }

  if (issues.length > 0) {
    console.log("");
    for (const i of issues) {
      console.log(pc.red(i));
    }
    outro(pc.red("Issues found. Please resolve them above."));
    process.exit(1);
  } else if (warnings.length > 0) {
    outro(pc.yellow("Some warnings. ccx should work, but consider fixing them."));
  } else {
    outro(pc.green("All systems operational! 🚀"));
  }
}
