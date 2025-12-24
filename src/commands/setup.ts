import { intro, outro, text, confirm, select, spinner, isCancel, cancel, note } from "@clack/prompts";
import { ConfigManager } from "../core/config";
import { ShellIntegrator } from "../core/shell";
import { spawn } from "bun";
import pc from "picocolors";

export async function setupCommand() {
  intro(pc.bgBlue(pc.white(" Claude-GLM Setup ")));

  const configManager = new ConfigManager();
  const config = await configManager.read();
  const shellInt = new ShellIntegrator();

  // 1. Check for Claude Binary (Self-Healing)
  const claudePath = await shellInt.findClaudeBinary();
  if (!claudePath) {
      note(pc.yellow("Claude Code is not installed or not found."));
      const installClaude = await confirm({
          message: "Would you like to install Claude Code now? (npm required)",
          initialValue: true
      });
      
      if (isCancel(installClaude)) { cancel("Setup cancelled"); process.exit(0); }
      
      if (installClaude) {
          const s = spinner();
          s.start("Installing @anthropic-ai/claude-code...");
          try {
              const proc = spawn(["npm", "install", "-g", "@anthropic-ai/claude-code"], {
                  stdio: ["ignore", "ignore", "ignore"]
              });
              await proc.exited;
              if (proc.exitCode === 0) {
                  s.stop(pc.green("Claude Code installed successfully!"));
              } else {
                  s.stop(pc.red("Installation failed. Please install manually: npm install -g @anthropic-ai/claude-code"));
              }
          } catch {
              s.stop(pc.red("npm not found or failed."));
          }
      }
  }

  // 2. Z.AI Config
  if (!config.zaiApiKey) {
    const openBrowser = await confirm({
        message: "No Z.AI API key found. Open dashboard to get one?",
        initialValue: true
    });
    
    if (openBrowser && !isCancel(openBrowser)) {
        spawn(["open", "https://z.ai/manage-apikey/apikey-list"]).catch(() => {});
        spawn(["xdg-open", "https://z.ai/manage-apikey/apikey-list"]).catch(() => {}); // Linux
        spawn(["explorer", "https://z.ai/manage-apikey/apikey-list"]).catch(() => {}); // Windows
    }

    const zaiKey = await text({
      message: "Enter your Z.AI API Key:",
      placeholder: "sk-...",
      validate: (value) => {
        if (!value) return "API Key is required";
      },
    });

    if (isCancel(zaiKey)) {
      cancel("Setup cancelled");
      process.exit(0);
    }
    
    config.zaiApiKey = zaiKey as string;
  }

  // 3. Minimax Config
  const minimax = await confirm({
    message: "Do you want to configure Minimax (M2.1)?",
    initialValue: !!config.minimaxApiKey,
  });

  if (isCancel(minimax)) { cancel("Setup cancelled"); process.exit(0); }

  if (minimax) {
    const mmKey = await text({
      message: "Enter Minimax API Key:",
      initialValue: config.minimaxApiKey,
      placeholder: "Enter key or leave empty to skip",
    });
    if (isCancel(mmKey)) { cancel("Setup cancelled"); process.exit(0); }
    if (mmKey) config.minimaxApiKey = mmKey as string;
  }

  // 4. Shell Config
  const detectedShell = shellInt.detectShell();

  if (detectedShell !== "unknown") {
    const installAliases = await select({
      message: `Install shell aliases for ${detectedShell}? (cc, ccg, ccm...)`,
      options: [
        { value: "yes", label: "Yes, install standard aliases", hint: "Recommended" },
        { value: "no", label: "No, I will use 'ccx' directly" },
      ],
    });

    if (isCancel(installAliases)) { cancel("Setup cancelled"); process.exit(0); }

    if (installAliases === "yes") {
      const s = spinner();
      s.start("Installing aliases...");
      const success = await shellInt.installAliases(detectedShell);
      
      // Attempt to ensure local bin is in path
      await shellInt.ensureLocalBinInPath(detectedShell);

      if (success) {
        s.stop("Aliases installed!");
        config.aliases = true;
      } else {
        s.stop("Failed to install aliases (check permissions)");
      }
    }
  }

  await configManager.write(config);
  
  outro(pc.green("Setup complete! Run 'ccx' to start."));
}
