# Claude-GLM Wrapper (ccx)

> **📢 Community Fork Notice**
> 
> This is an actively maintained community fork of the original [claude-glm-wrapper](https://github.com/JoeInnsp23/claude-glm-wrapper). 
> Now rewritten in **Bun** for 10x speed and single-binary simplicity.
> 
> Install via: `bunx cc-x10ded setup` or download the binary.

---

Use [Z.AI's GLM models](https://z.ai), [Minimax](https://minimax.io), [OpenAI](https://openai.com), and more with [Claude Code](https://www.anthropic.com/claude-code).

**One Binary. Zero Friction.**

## Why ccx?

**🚀 10x Faster**: Native binary (written in Bun/TypeScript), starts instantly.
**📦 Single Binary**: No more "wrapper hell". One `ccx` executable handles everything.
**🛡️ Safe & Clean**: No more `eval` in shell scripts. Configs stored safely in `~/.config`.
**🔀 Multi-Provider**: Switch between GLM, Minimax, OpenAI, Gemini, and Claude instantly.
**🩺 Self-Healing**: Includes a `doctor` command to diagnose and fix configuration issues automatically.

## Quick Start

### Installation

**If you have Bun (recommended):**
```bash
bunx cc-x10ded setup
```

**Manual Download (Mac/Linux/Windows):**
1. Download the latest release from [GitHub Releases](https://github.com/MohMaya/claude-glm-wrapper/releases).
2. Run `./ccx setup` (or `.\ccx.exe setup` on Windows).

### Setup Wizard

Run `ccx setup` to:
1. Configure your API keys (Z.AI, Minimax, OpenAI, etc.).
2. Install shell aliases (`cc`, `ccg`, `ccm`...) automatically.
3. Verify your Claude Code installation.

## Usage

### Commands

| Command | Action |
|---------|--------|
| `ccx` | Run Claude Code with your default model (e.g. GLM-4.7) |
| `ccx setup` | Run the interactive setup wizard |
| `ccx config` | Open configuration file |
| `ccx doctor` | Run self-diagnostics to check API keys, paths, and dependencies |
| `ccx update` | Update to the latest version |
| `ccx --model=gpt-4o` | Run with a specific model override |

### Aliases (Optional)

If you enabled aliases during setup:


**🆕 New: ccx Multi-Provider Proxy**
| Alias | Equivalent Command |
|-------|-------------------|
| `ccx` | `bunx cc-x10ded` |
| `ccg` | `bunx cc-x10ded --model=glm-4.7` |
| `ccg45` | `bunx cc-x10ded --model=glm-4.5` |
| `ccf` | `bunx cc-x10ded --model=glm-4.5-air` |
| `ccm` | `bunx cc-x10ded --model=MiniMax-M2.1` |

### Multi-Provider Proxy

`ccx` automatically acts as a local proxy. You can use ANY supported provider by specifying the prefix:

```bash
ccx --model=openai:gpt-4o
ccx --model=gemini:gemini-1.5-pro
ccx --model=minimax:MiniMax-M2.1
```

Or switch **in-session** using Claude's slash command:
`/model openai:gpt-4o`

### Auto-Discovery (Zero Config)

`ccx` is smart! It automatically detects API keys in your environment variables, so you might not even need to run setup.

Supported variables:
- `ZAI_API_KEY` or `GLM_API_KEY`
- `MINIMAX_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`

## Configuration

Config is stored in `~/.config/claude-glm/config.json`.
You can edit it with `ccx config`.

```json
{
  "zaiApiKey": "sk-...",
  "minimaxApiKey": "...",
  "providers": {
    "openai": { "apiKey": "sk-..." }
  },
  "defaults": {
    "model": "glm-4.7"
  }
}
```

## Migrating from Old Versions

If you're upgrading from `claude-glm-wrapper` (pre-3.0), you need to clean up the old installation:

```bash
# Remove old global package
npm uninstall -g claude-glm-wrapper

# Remove old proxy files (no longer used)
rm -rf ~/.claude-proxy/

# Install new version
bunx cc-x10ded setup
```

The new version:
- Uses `bunx cc-x10ded` instead of `ccx` command
- Runs proxy in-process (no separate process or `~/.claude-proxy/`)
- Stores config in `~/.config/claude-glm/` (unchanged)

## Troubleshooting

**"ccx: command not found"**
Run `bunx cc-x10ded setup` to install shell aliases, then restart your terminal.

**"Error: 'claude' command not found"**
Run `bunx cc-x10ded doctor` — it will check your Claude Code installation.

## License

MIT
