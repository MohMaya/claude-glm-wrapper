import { ConfigManager } from "../core/config";
import * as pc from "picocolors";
import { spawn } from "bun";

export async function configCommand() {
  const manager = new ConfigManager();
  const path = manager.getPath();
  manager.ensureConfigDir();
  
  console.log(`Config file: ${path}`);
  
  // Try to open with default editor
  const editor = process.env.EDITOR || "nano"; // Fallback to nano if EDITOR not set
  
  try {
    const proc = spawn([editor, path], {
        stdio: ["inherit", "inherit", "inherit"]
    });
    await proc.exited;
  } catch (e) {
      console.log(pc.red("Could not open editor. Please edit the file manually."));
  }
}
