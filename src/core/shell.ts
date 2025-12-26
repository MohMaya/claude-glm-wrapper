import { join } from "path";
import { homedir, platform } from "os";
import { existsSync, mkdirSync } from "fs";

export type ShellType = "bash" | "zsh" | "fish" | "powershell" | "unknown";

export class ShellIntegrator {
  private home = homedir();

  detectShell(): ShellType {
    const shellPath = process.env.SHELL;
    if (platform() === "win32") return "powershell";
    if (!shellPath) return "unknown";
    if (shellPath.includes("zsh")) return "zsh";
    if (shellPath.includes("bash")) return "bash";
    if (shellPath.includes("fish")) return "fish";
    return "unknown";
  }

  getProfilePath(shell: ShellType): string | null {
    if (shell === "zsh") return join(this.home, ".zshrc");
    if (shell === "bash") {
      // Prefer .bashrc, fallback to .bash_profile
      const bashrc = join(this.home, ".bashrc");
      const bashProfile = join(this.home, ".bash_profile");
      if (existsSync(bashrc)) return bashrc;
      if (existsSync(bashProfile)) return bashProfile;
      return bashrc; // default
    }
    if (shell === "fish") return join(this.home, ".config", "fish", "config.fish");
    if (shell === "powershell") {
        // Standard PowerShell profile paths
        // We try to find Documents folder first
        const docs = join(this.home, "Documents");
        if (existsSync(docs)) {
             const psDir = join(docs, "PowerShell");
             if (!existsSync(psDir)) {
                 try { mkdirSync(psDir, { recursive: true }); } catch {}
             }
             return join(psDir, "Microsoft.PowerShell_profile.ps1");
        }
        // Fallback to OneDrive/Documents if needed or just home/Documents
        return join(this.home, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1");
    }
    return null;
  }

  async installAliases(shell: ShellType) {
    const profile = this.getProfilePath(shell);
    if (!profile) return false;

    // Ensure directory exists for the profile
    const dir = join(profile, "..");
    if (!existsSync(dir)) {
        try { mkdirSync(dir, { recursive: true }); } catch {}
    }
    
    // Check if file exists, if not create empty
    if (!existsSync(profile)) {
        await Bun.write(profile, "");
    }

    const aliasBlock = this.generateAliasBlock(shell);
    if (!aliasBlock) return false;

    let content = "";
    if (existsSync(profile)) {
      content = await Bun.file(profile).text();
    }

    const startMarker = "# >>> claude-glm-wrapper >>>";
    const endMarker = "# <<< claude-glm-wrapper <<<";

    // Remove existing block
    const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, "g");
    content = content.replace(regex, "").trim();

    // Append new block
    const newContent = `${content}\n\n${startMarker}\n${aliasBlock}\n${endMarker}\n`;
    
    await Bun.write(profile, newContent);
    return true;
  }

  private generateAliasBlock(shell: ShellType): string {
    // Use global ccx binary for faster startup (no bunx resolution overhead)
    // ccx is installed globally via: bun install -g cc-x10ded
    if (shell === "zsh" || shell === "bash") {
      return `# Installed via: bun install -g cc-x10ded
# Update with: ccx update
alias ccg='ccx --model=glm-4.7'
alias ccg46='ccx --model=glm-4.6'
alias ccg45='ccx --model=glm-4.5'
alias ccf='ccx --model=glm-4.5-air'
alias ccm='ccx --model=MiniMax-M2.1'`;
    }
    if (shell === "fish") {
       return `# Installed via: bun install -g cc-x10ded
# Update with: ccx update
alias ccg 'ccx --model=glm-4.7'
alias ccg46 'ccx --model=glm-4.6'
alias ccg45 'ccx --model=glm-4.5'
alias ccf 'ccx --model=glm-4.5-air'
alias ccm 'ccx --model=MiniMax-M2.1'`;
    }
    if (shell === "powershell") {
        return `# Installed via: bun install -g cc-x10ded
# Update with: ccx update
Function ccg { ccx --model=glm-4.7 @args }
Function ccg46 { ccx --model=glm-4.6 @args }
Function ccg45 { ccx --model=glm-4.5 @args }
Function ccf { ccx --model=glm-4.5-air @args }
Function ccm { ccx --model=MiniMax-M2.1 @args }`;
    }
    return "";
  }
  
  async ensureBunBinInPath(shell: ShellType) {
      if (platform() === "win32") return; // Windows handles PATH differently

      const profile = this.getProfilePath(shell);
      if (!profile || !existsSync(profile)) return;

      const bunBin = join(this.home, ".bun", "bin");
      const content = await Bun.file(profile).text();

      // Check if bun bin is already in PATH (either via env or in profile)
      const bunPathExport = `export PATH="$HOME/.bun/bin:$PATH"`;
      const bunPathExportAlt = `export BUN_INSTALL="$HOME/.bun"`;

      if (!content.includes(".bun/bin") && !process.env.PATH?.includes(bunBin)) {
          // Add bun to PATH
          const addition = `\n# Bun global binaries\nexport BUN_INSTALL="$HOME/.bun"\nexport PATH="$BUN_INSTALL/bin:$PATH"\n`;
          await Bun.write(profile, content + addition);
      }
  }

  async ensureLocalBinInPath(shell: ShellType) {
      if (platform() === "win32") return; // Windows handles PATH differently (usually handled by installer or user)

      const profile = this.getProfilePath(shell);
      if (!profile || !existsSync(profile)) return;

      const localBin = join(this.home, ".local", "bin");
      const content = await Bun.file(profile).text();

      // Heuristic check
      if (!content.includes(localBin) && !process.env.PATH?.includes(localBin)) {
          const exportCmd = `export PATH="$HOME/.local/bin:$PATH"`;
          if (!content.includes(exportCmd)) {
              await Bun.write(profile, `${content}\n\n# Added by claude-glm-wrapper\n${exportCmd}\n`);
          }
      }
  }

  /**
   * Migrate old bunx-based aliases to new ccx-based aliases
   */
  async migrateAliases(shell: ShellType): Promise<boolean> {
      const profile = this.getProfilePath(shell);
      if (!profile || !existsSync(profile)) return false;

      let content = await Bun.file(profile).text();

      // Check if migration is needed (old bunx-based aliases exist)
      if (!content.includes("bunx cc-x10ded")) {
          return false; // No migration needed
      }

      // Remove old block and install new one
      const startMarker = "# >>> claude-glm-wrapper";
      const endMarker = "# <<< claude-glm-wrapper <<<";
      const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, "g");
      content = content.replace(regex, "").trim();

      // Write cleaned content
      await Bun.write(profile, content);

      // Install new aliases
      return await this.installAliases(shell);
  }

  /**
   * Hunt for the 'claude' binary in common locations
   */
  async findClaudeBinary(): Promise<string | null> {
    // 1. Check PATH
    try {
        const path = Bun.which("claude");
        if (path) return path;
    } catch {}

    // 2. Common Locations
    const locations = [
        join(this.home, ".npm-global", "bin", "claude"),
        "/usr/local/bin/claude",
        "/opt/homebrew/bin/claude",
        join(this.home, "bin", "claude"),
        join(this.home, ".local", "bin", "claude"),
        // Windows
        join(process.env.APPDATA || "", "npm", "claude.cmd"),
        join(process.env.APPDATA || "", "npm", "claude.ps1"),
    ];

    for (const loc of locations) {
        if (existsSync(loc)) return loc;
    }

    return null;
  }

}
