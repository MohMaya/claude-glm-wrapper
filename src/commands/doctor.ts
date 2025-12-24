import { intro, outro, spinner } from "@clack/prompts";
import { ShellIntegrator } from "../core/shell";
import { ConfigManager } from "../core/config";
import * as pc from "picocolors";
import { existsSync } from "fs";

export async function doctorCommand() {
  intro(pc.bgBlue(pc.white(" ccx Doctor 🩺 ")));

  const s = spinner();
  const issues: string[] = [];
  const checks: string[] = [];

  // 1. Check Config
  s.start("Checking configuration...");
  const configManager = new ConfigManager();
  const config = await configManager.read();
  
  if (!config.zaiApiKey && !config.minimaxApiKey && Object.keys(config.providers).length === 0) {
      issues.push("❌ No API keys configured. Run 'ccx setup'.");
  } else {
      checks.push("✅ Configuration loaded");
  }
  s.stop("Configuration check complete");

  // 2. Check Claude Binary
  s.start("Checking Claude Code installation...");
  const shellInt = new ShellIntegrator();
  const claudePath = await shellInt.findClaudeBinary();
  
  if (claudePath) {
      checks.push(`✅ Claude binary found: ${claudePath}`);
  } else {
      issues.push("❌ 'claude' command not found in common locations.");
      issues.push("   👉 Suggestion: Run 'npm install -g @anthropic-ai/claude-code'");
  }
  s.stop("Claude check complete");

  // 3. Check Shell Integration
  s.start("Checking shell integration...");
  const shell = shellInt.detectShell();
  const profile = shellInt.getProfilePath(shell);
  
  if (shell === "unknown") {
      issues.push("⚠️  Could not detect shell type.");
  } else {
      checks.push(`✅ Shell detected: ${shell}`);
      if (profile && existsSync(profile)) {
          const content = await Bun.file(profile).text();
          if (content.includes("ccx")) {
              checks.push("✅ Aliases found in profile");
          } else {
              issues.push(`⚠️  Aliases missing in ${profile}. Run 'ccx setup'.`);
          }
      }
  }
  s.stop("Shell check complete");

  // 4. Check Network/Proxy (Port 17870)
  // We won't actually bind, just check if we can
  
  console.log("\n" + pc.bold("Diagnostic Report:"));
  checks.forEach(c => console.log(c));
  console.log("");
  
  if (issues.length > 0) {
      issues.forEach(i => console.log(i));
      outro(pc.yellow("Issues found. Please resolve them above."));
      process.exit(1);
  } else {
      outro(pc.green("All systems operational! 🚀"));
  }
}
