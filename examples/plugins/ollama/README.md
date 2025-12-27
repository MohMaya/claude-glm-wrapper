# Ollama Plugin for ccx

This example plugin demonstrates how to integrate local Ollama models with ccx.

## Installation

```bash
# 1. Ensure Ollama is running (default: http://localhost:11434)
ollama serve

# 2. Pull a model
ollama pull llama3.1

# 3. Create plugin directory
mkdir -p ~/.config/claude-glm/plugins/ollama

# 4. Copy plugin files
cp plugin.json ~/.config/claude-glm/plugins/ollama/
cp dist/index.js ~/.config/claude-glm/plugins/ollama/

# 5. Verify installation
ccx models
```

## Building

```bash
# From the examples/plugins/ollama directory:
bun build ./index.ts --outdir ./dist --target bun
```

## Configuration

No API key required for local Ollama. The plugin connects to `http://localhost:11434` by default.

You can override the base URL by adding to your config:

```json
{
  "plugins": {
    "ollama": {
      "baseUrl": "http://ollama:11434"
    }
  }
}
```

## Supported Models

- Llama 3.1 8B (131K context)
- Qwen 2.5 72B (131K context)
- Mistral 7B (32K context)
- CodeLlama 7B (16K context)
- DeepSeek Coder 6.7B (16K context)

## Adding Custom Models

Edit `index.ts` to add more models:

```typescript
const MODELS: ModelInfo[] = [
  { id: "your-model", name: "Your Model Name", contextWindow: 32768 },
  // Add more models...
];
```

Then rebuild and reinstall.
