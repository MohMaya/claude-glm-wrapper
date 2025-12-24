import { spawn } from "bun";
import { ConfigManager } from "../core/config";
import { startProxyServer } from "../proxy/server";
import { ShellIntegrator } from "../core/shell";
import pc from "picocolors";

export async function runCommand(args: string[], options: { model?: string; port?: number }) {
  const configManager = new ConfigManager();
  const config = await configManager.read();

  if (!config.zaiApiKey && !config.minimaxApiKey && Object.keys(config.providers).length === 0) {
    console.log(pc.yellow("Configuration missing. Running setup..."));
    const { setupCommand } = await import("./setup");
    await setupCommand();
    // Re-read config
    Object.assign(config, await configManager.read());
  }

  // Port hunting logic
  let port = options.port || 17870;
  let server;
  let retries = 0;
  
  while (retries < 10) {
      try {
          server = startProxyServer(config, port);
          break;
      } catch (e: any) {
          if (e.code === "EADDRINUSE" || e.message.includes("EADDRINUSE")) {
              port++;
              retries++;
          } else {
              throw e;
          }
      }
  }
  
  if (!server) {
      console.error(pc.red(`Failed to start proxy server after 10 attempts (ports ${options.port || 17870}-${port}).`));
      process.exit(1);
  }

  const model = options.model || config.defaults.model || "glm-4.7";

  // Robust binary finding
  const shellInt = new ShellIntegrator();
  const claudePath = await shellInt.findClaudeBinary();

  if (!claudePath) {
      console.error(pc.red("Error: 'claude' command not found."));
      console.error(pc.yellow("Self-Healing Tip: Run 'ccx setup' or 'npm install -g @anthropic-ai/claude-code'"));
      process.exit(1);
  }

  const env = {
    ...process.env,
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
    ANTHROPIC_AUTH_TOKEN: "ccx-proxy-token", // Dummy token for the client
    ANTHROPIC_MODEL: model,
  };

  try {
    const proc = spawn([claudePath, ...args], {
      env,
      stdio: ["inherit", "inherit", "inherit"],
    });

    const code = await proc.exited;
    process.exit(code);
  } catch (e: any) {
    console.error(pc.red(`Error starting Claude: ${e.message}`));
    process.exit(1);
  } finally {
    server.stop();
  }
}
