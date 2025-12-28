#!/usr/bin/env bun
import { cac } from "cac";
import { runCommand } from "./commands/run";
import { setupCommand } from "./commands/setup";
import { configCommand } from "./commands/config";
import { doctorCommand } from "./commands/doctor";
import { modelsCommand } from "./commands/models";
import packageJson from "../package.json";
import { createLogger } from "./core/logger";

const logger = createLogger();

const cli = cac("ccx");

cli
  .command("setup", "Run the interactive setup wizard")
  .action(setupCommand);

cli
  .command("config", "Edit configuration file")
  .action(configCommand);

cli
  .command("doctor", "Run self-diagnostics")
  .action(doctorCommand);

cli
  .command("models", "List all available models")
  .action(async () => {
    await modelsCommand();
  });

cli
  .command("update", "Update ccx to the latest version")
  .option("--skip-aliases", "Skip alias installation")
  .option("--skip-cleanup", "Skip removal of old binaries")
  .action(async (options: { skipAliases?: boolean; skipCleanup?: boolean }) => {
    const { spawn } = await import("bun");
    const { ShellIntegrator } = await import("./core/shell");
    const pc = await import("picocolors");

    const shellInt = new ShellIntegrator();
    const shell = shellInt.detectShell();

    if (!options.skipCleanup) {
      const removed = await shellInt.cleanupOldBinaries();
      if (removed.length > 0) {
        console.log(pc.default.yellow("🧹 Removed old ccx binaries:"));
        for (const p of removed) {
          console.log(pc.default.dim(`   ${p}`));
        }
      }
    }

    console.log(pc.default.blue("📦 Updating ccx..."));
    const proc = spawn(["bun", "install", "-g", "cc-x10ded@latest"], {
      stdio: ["inherit", "inherit", "inherit"]
    });
    await proc.exited;

    if (proc.exitCode !== 0) {
      console.error(pc.default.red("❌ Update failed."));
      process.exit(1);
    }

    console.log(pc.default.green("✅ ccx updated!"));

    if (shell !== "unknown") {
      await shellInt.ensureBunBinInPath(shell);

      if (!shellInt.isBunBinFirst()) {
        console.log(pc.default.yellow("⚠️  ~/.bun/bin should be first in PATH for ccx to work correctly."));
        console.log(pc.default.dim("   Add this to the TOP of your shell config:"));
        console.log(pc.default.cyan('   export PATH="$HOME/.bun/bin:$PATH"'));
      }
    }

    if (!options.skipAliases && shell !== "unknown") {
      const success = await shellInt.installAliases(shell);
      if (success) {
        console.log(pc.default.green("✅ Aliases updated!"));
      }
    }

    console.log(pc.default.green("\n🎉 Update complete!"));
    if (shell !== "unknown") {
      console.log(pc.default.dim(`   Run: source ~/.${shell}rc (or restart your terminal)`));
    }
  });

cli
  .command("[...args]", "Run Claude Code with proxy (default)")
  .option("-m, --model <model>", "Override the model (e.g., glm-4.5, openai:gpt-4o)")
  .option("-p, --port <port>", "Port for the local proxy (default: 17870)")
  .option("--debug", "Enable debug logging")
  .option("--json-log", "Output logs in JSON format")
  .action((args, options) => {
    if (options.jsonLog) {
      logger.setJsonMode(true);
    }
    if (options.debug) {
      logger.setDebugMode(true);
    }
    runCommand(args, { model: options.model, port: options.port });
  });

cli
  .command("--list", "List all available models (alias for 'models')")
  .action(async () => {
    await modelsCommand();
  });

cli.help();
cli.version(packageJson.version);

try {
  cli.parse();
} catch (error: any) {
  console.error(error.message);
  process.exit(1);
}
