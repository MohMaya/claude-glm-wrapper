# Claude-GLM Wrapper (ccx)

> **Community Fork** of [claude-glm-wrapper](https://github.com/JoeInnsp23/claude-glm-wrapper), rewritten in **Bun** for speed and simplicity.

Use [Z.AI GLM](https://z.ai), [Minimax](https://minimax.io), [OpenAI](https://openai.com), [Gemini](https://ai.google.dev), and more with [Claude Code](https://www.anthropic.com/claude-code).

## Quick Start

### Installation (Recommended)

```bash
# Install globally (fast startup, no resolution overhead)
bun install -g cc-x10ded@latest

# Run setup wizard
ccx setup
```

### Alternative: One-liner with bunx

```bash
bunx cc-x10ded setup
```

## Usage

### Commands

| Command | Description |
|---------|-------------|
| `ccx` | Run Claude Code with default model (GLM-4.7) |
| `ccx setup` | Interactive setup wizard |
| `ccx update` | Update ccx and migrate aliases |
| `ccx doctor` | Diagnose configuration issues |
| `ccx config` | Open configuration file |

### Model Aliases

After setup, use these shortcuts:

| Alias | Model |
|-------|-------|
| `ccg` | GLM-4.7 (default) |
| `ccg46` | GLM-4.6 |
| `ccg45` | GLM-4.5 |
| `ccf` | GLM-4.5-air (fast) |
| `ccm` | MiniMax-M2.1 |

### Multi-Provider Support

Specify any provider with a prefix:

```bash
ccx --model=openai:gpt-4o
ccx --model=gemini:gemini-2.0-flash
ccx --model=minimax:MiniMax-M2.1
ccx --model=glm-4.7           # No prefix needed for GLM
```

Or switch in-session: `/model openai:gpt-4o`

## Configuration

Config is stored in `~/.config/claude-glm/config.json`:

```json
{
  "zaiApiKey": "your-zai-key",
  "minimaxApiKey": "your-minimax-key",
  "providers": {
    "openai": { "apiKey": "sk-..." },
    "gemini": { "apiKey": "..." }
  },
  "defaults": {
    "model": "glm-4.7"
  }
}
```

### Environment Variables (Auto-Discovery)

ccx automatically detects these environment variables:

- `ZAI_API_KEY` / `GLM_API_KEY`
- `MINIMAX_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`

## Updating

```bash
ccx update
```

This will:
1. Install the latest version globally
2. Migrate old `bunx`-based aliases to new format (if needed)

## Migrating from Old Versions

If upgrading from v3.0.14 or earlier (bunx-based aliases):

```bash
# Update and migrate aliases automatically
ccx update

# Or manually reinstall
bun install -g cc-x10ded@latest
ccx setup
```

If upgrading from pre-3.0 (`claude-glm-wrapper`):

```bash
# Remove old installation
npm uninstall -g claude-glm-wrapper
rm -rf ~/.claude-proxy/

# Install new version
bun install -g cc-x10ded@latest
ccx setup
```

## Troubleshooting

**"ccx: command not found"**

Ensure bun's bin directory is in your PATH:
```bash
export PATH="$HOME/.bun/bin:$PATH"
```

Then reinstall: `bun install -g cc-x10ded@latest`

**"Error: 'claude' command not found"**

Run `ccx doctor` to check your Claude Code installation.

**Aliases not working after update**

Run `ccx update` to migrate aliases, then:
```bash
source ~/.zshrc  # or restart your terminal
```

## Why ccx?

- **Fast startup**: Global binary, no bunx resolution overhead
- **Multi-provider**: GLM, Minimax, OpenAI, Gemini, Anthropic, OpenRouter
- **Self-healing**: `ccx doctor` diagnoses and fixes issues
- **Zero config**: Auto-discovers API keys from environment

## License

MIT
