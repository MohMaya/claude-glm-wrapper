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
  .action(async (options: { skipAliases?: boolean }) => {
    const { spawn } = await import("bun");
    const { ShellIntegrator } = await import("./core/shell");
    const pc = await import("picocolors");

    console.log(pc.default.blue("Updating ccx..."));

    // Update via bun global install
    const proc = spawn(["bun", "install", "-g", "cc-x10ded@latest"], {
      stdio: ["inherit", "inherit", "inherit"]
    });
    await proc.exited;

    if (proc.exitCode !== 0) {
      console.error(pc.default.red("❌ Update failed."));
      process.exit(1);
    }

    console.log(pc.default.green("✅ ccx updated!"));

    // Always reinstall aliases (unless skipped)
    if (!options.skipAliases) {
      const shellInt = new ShellIntegrator();
      const shell = shellInt.detectShell();

      if (shell !== "unknown") {
        // Ensure bun bin is in PATH
        await shellInt.ensureBunBinInPath(shell);

        // Install/update aliases
        const success = await shellInt.installAliases(shell);
        if (success) {
          console.log(pc.default.green("✅ Aliases updated!"));
          console.log(pc.default.dim(`   Run: source ~/.${shell}rc (or restart your terminal)`));
        }
      }
    }

    console.log(pc.default.green("\n🎉 Update complete!"));
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
