import { spawn } from "bun";
import { ConfigManager } from "../core/config";
import { startProxyServer } from "../proxy/server";
import { ShellIntegrator } from "../core/shell";
import { parseProviderModel } from "../proxy/map";
import { telemetry } from "../core/telemetry";
import * as pc from "picocolors";

export async function runCommand(args: string[], options: { model?: string; port?: number }) {
  const startTime = Date.now();
  const configManager = new ConfigManager();
  const config = await configManager.read();

  if (!config.zaiApiKey && !config.minimaxApiKey && Object.keys(config.providers).length === 0) {
    console.log(pc.yellow("Configuration missing. Running setup..."));
    const { setupCommand } = await import("./setup");
    await setupCommand();
    Object.assign(config, await configManager.read());
  }

  const model = options.model || config.defaults.model || "glm-4.7";
  const { provider } = parseProviderModel(model);

  let useProxy = true;

  if (provider === "anthropic") {
    useProxy = false;
  }

  let port = options.port || 17870;
  let server: ReturnType<typeof startProxyServer> | undefined = undefined;

  if (useProxy) {
    let retries = 0;
    while (retries < 10) {
      try {
        server = startProxyServer(config, port);
        break;
      } catch (e: unknown) {
        const error = e as { code?: string; message?: string };
        if (error.code === "EADDRINUSE" || (error.message && error.message.includes("EADDRINUSE"))) {
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
  }

  const shellInt = new ShellIntegrator();
  const claudePath = await shellInt.findClaudeBinary();

  if (!claudePath) {
    console.error(pc.red("Error: 'claude' command not found."));
    console.error(pc.yellow("Self-Healing Tip: Run 'ccx setup' or 'npm install -g @anthropic-ai/claude-code'"));
    process.exit(1);
  }

  const env: Record<string, string | undefined> = {
    ...process.env,
  };

  if (useProxy) {
    env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
    env.ANTHROPIC_AUTH_TOKEN = `ccx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    env.ANTHROPIC_MODEL = model;
  }

  try {
    const proc = spawn([claudePath, ...args], {
      env: env as any,
      stdio: ["inherit", "inherit", "inherit"],
    });

    const code = await proc.exited;
    
    const latencyMs = Date.now() - startTime;
    telemetry.trackRequest(provider, model, latencyMs, code === 0);
    
    process.exit(code);
  } catch (e: any) {
    console.error(pc.red(`Error starting Claude: ${e.message}`));
    telemetry.trackRequest(provider, model, Date.now() - startTime, false, "spawn_error");
    process.exit(1);
  } finally {
    if (server) server.stop();
  }
}
