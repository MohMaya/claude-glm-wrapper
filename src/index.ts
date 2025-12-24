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
  .action(async () => {
    console.log("Updating ccx...");
    const { spawn } = await import("bun");
    const proc = spawn(["npm", "install", "-g", "claude-glm-wrapper"], { stdio: ["inherit", "inherit", "inherit"] });
    await proc.exited;
    if (proc.exitCode === 0) {
        console.log("✅ Update complete!");
    } else {
        console.error("❌ Update failed.");
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
