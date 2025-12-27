# ccx Plugin System

Extend ccx with custom model providers.

## Overview

The plugin system allows you to add any OpenAI-compatible API as a provider in ccx. Plugins are discovered from `~/.config/claude-glm/plugins/` and automatically loaded at runtime.

## Quick Start

### 1. Create Plugin Directory

```bash
mkdir -p ~/.config/claude-glm/plugins/my-provider
```

### 2. Create Plugin Manifest

Create `plugin.json` in your plugin directory:

```json
{
  "id": "my-provider",
  "name": "My Custom Provider",
  "version": "1.0.0",
  "description": "A custom model provider",
  "entry": "./dist/index.js"
}
```

### 3. Write Plugin Implementation

Create `index.ts` with your plugin code (see Example below).

### 4. Build Plugin

```bash
bun build ./index.ts --outdir ./dist --target bun
```

### 5. Verify Installation

```bash
ccx models
```

Your provider should now appear in the list.

## Plugin API

### ProviderPlugin Interface

```typescript
import type { ProviderPlugin } from "@ccx/plugin-types";

export default {
  id: "my-provider",
  name: "My Provider",
  version: "1.0.0",
  description: "Description of your provider",
  models: [
    { id: "model-1", name: "Model 1", contextWindow: 128000 },
    { id: "model-2", name: "Model 2", contextWindow: 64000, default: true }
  ],
  createClient(config) {
    return new MyProviderClient(config);
  }
} satisfies ProviderPlugin;
```

### ProviderClient Interface

Your client must implement:

```typescript
interface ProviderClient {
  readonly provider: string;

  // Stream completions (required)
  streamComplete(request: AnthropicRequest): AsyncGenerator<SSEMessage>;

  // Get model info (optional)
  getModelInfo(): ModelInfo | undefined;

  // Health check (optional)
  healthCheck(): Promise<HealthStatus>;
}
```

### SSE Message Format

Messages must be in Anthropic's SSE format:

```typescript
interface SSEMessage {
  type: string;  // "message_start", "content_block_delta", "message_delta", "message_stop"
  data: {
    type?: string;
    index?: number;
    delta?: { type: "text_delta"; text: string };
    stop_reason?: string;
    usage?: { input_tokens: number; output_tokens: number };
  };
}
```

## Example: Ollama Plugin

See `examples/plugins/ollama/` for a complete working example.

## Type Definitions

Install the official type definitions:

```bash
bun add -D @ccx/plugin-types
```

## Configuration

Plugins can read configuration from the main config file:

```json
{
  "plugins": {
    "my-provider": {
      "apiKey": "your-api-key",
      "baseUrl": "https://api.example.com/v1",
      "extra": {
        "customOption": true
      }
    }
  }
}
```

## Best Practices

1. **Handle errors gracefully** - Return meaningful error messages
2. **Implement health checks** - Helps with `ccx doctor` diagnostics
3. **Support streaming** - Users expect real-time responses
4. **Respect rate limits** - Implement backoff on 429 errors
5. **Use environment variables** - Allow API key via env vars

## Publishing

Want to share your plugin?

1. Create a GitHub repository with your plugin code
2. Add installation instructions to your README
3. Submit a PR to add your plugin to the examples directory

## Troubleshooting

### Plugin Not Loading

Check `ccx doctor` for plugin errors. Common issues:
- Missing `plugin.json`
- Entry file not found
- TypeScript compilation errors

### Model Not Found

Ensure your model's `id` matches what users will type:
- `ccx --model=my-provider:model-1`

### API Errors

Implement proper error handling in your plugin to surface meaningful errors to users.

## API Reference

See [@ccx/plugin-types](https://www.npmjs.com/package/@ccx/plugin-types) for complete type definitions.
