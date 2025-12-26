#!/usr/bin/env bun
import { cac } from "cac";
import { runCommand } from "./commands/run";
import { setupCommand } from "./commands/setup";
import { configCommand } from "./commands/config";
import { doctorCommand } from "./commands/doctor";
import packageJson from "../package.json";

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
  .command("update", "Update ccx to the latest version")
  .option("--skip-aliases", "Skip alias installation")
  .option("--skip-cleanup", "Skip removal of old binaries")
  .action(async (options: { skipAliases?: boolean; skipCleanup?: boolean }) => {
    const { spawn } = await import("bun");
    const { ShellIntegrator } = await import("./core/shell");
    const pc = await import("picocolors");

    const shellInt = new ShellIntegrator();
    const shell = shellInt.detectShell();

    // 1. Clean up old binaries first
    if (!options.skipCleanup) {
      const removed = await shellInt.cleanupOldBinaries();
      if (removed.length > 0) {
        console.log(pc.default.yellow("🧹 Removed old ccx binaries:"));
        removed.forEach(p => console.log(pc.default.dim(`   ${p}`)));
      }
    }

    // 2. Update via bun global install
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

    // 3. Ensure bun bin is in PATH (and prioritized)
    if (shell !== "unknown") {
      await shellInt.ensureBunBinInPath(shell);

      if (!shellInt.isBunBinFirst()) {
        console.log(pc.default.yellow("⚠️  ~/.bun/bin should be first in PATH for ccx to work correctly."));
        console.log(pc.default.dim("   Add this to the TOP of your shell config:"));
        console.log(pc.default.cyan('   export PATH="$HOME/.bun/bin:$PATH"'));
      }
    }

    // 4. Reinstall aliases (unless skipped)
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
  .action((args, options) => {
    runCommand(args, options);
  });

cli.help();
cli.version(packageJson.version);

try {
  cli.parse();
} catch (error: any) {
  console.error(error.message);
  process.exit(1);
}
