# Contributing to Claude-GLM Wrapper

Thank you for your interest in contributing to the **Bun-based** version of cc-x10ded!

## Development Setup

### Prerequisites

- **Bun**: This project is built entirely on Bun. [Install Bun](https://bun.sh/).
- **Claude Code**: Recommended for testing integration.

### Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MohMaya/claude-glm-wrapper.git
   cd claude-glm-wrapper
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Run in development mode**:
   ```bash
   bun run dev --help
   bun run dev doctor
   ```

### Project Structure

```
src/
├── commands/       # CLI commands (run, setup, doctor, config)
├── core/           # Core logic (ConfigManager, ShellIntegrator)
├── proxy/          # Proxy server logic & provider adapters
└── index.ts        # Entry point
```

## Adding Features

1. **New Providers**: Add logic to `src/proxy/server.ts` and `src/proxy/providers.ts`. Update `src/core/config.ts` to support new keys.
2. **New Commands**: Create a new file in `src/commands/` and register it in `src/index.ts`.

## Building

To compile the standalone binaries:

```bash
bun run build       # Builds for current OS
bun run build:all   # Builds for Linux, macOS, and Windows
```

Artifacts will be placed in `dist/`.

## Testing

Please run the doctor command to verify your environment changes didn't break core diagnostics:

```bash
bun run dev doctor
```

## Pull Request Process

1. Fork the repo and create your branch from `main`.
2. Ensure your code follows the existing style (Bun/TypeScript).
3. Update documentation if you add user-facing features.
4. Submit a PR!

## License

MIT
