import { describe, it, expect } from 'vitest';
import type {
  AnthropicContentBlock,
  AnthropicMessage,
  AnthropicTool,
  AnthropicRequest,
  ProviderKey,
  ProviderModel
} from './types';

describe('AnthropicContentBlock types', () => {
  it('should allow text content blocks', () => {
    const block: AnthropicContentBlock = { type: 'text', text: 'Hello' };
    expect(block.type).toBe('text');
    expect(block.text).toBe('Hello');
  });

  it('should allow image content blocks', () => {
    const block: AnthropicContentBlock = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: 'base64data'
      }
    };
    expect(block.type).toBe('image');
    expect(block.source.media_type).toBe('image/jpeg');
  });

  it('should allow tool_use content blocks', () => {
    const block: AnthropicContentBlock = {
      type: 'tool_use',
      id: 'tool-123',
      name: 'search',
      input: { query: 'test' }
    };
    expect(block.type).toBe('tool_use');
    expect(block.name).toBe('search');
  });

  it('should allow tool_result content blocks', () => {
    const block: AnthropicContentBlock = {
      type: 'tool_result',
      tool_use_id: 'tool-123',
      content: 'result'
    };
    expect(block.type).toBe('tool_result');
    expect(block.tool_use_id).toBe('tool-123');
  });
});

describe('AnthropicMessage types', () => {
  it('should allow string content', () => {
    const message: AnthropicMessage = {
      role: 'user',
      content: 'Hello world'
    };
    expect(message.content).toBe('Hello world');
  });

  it('should allow array content', () => {
    const message: AnthropicMessage = {
      role: 'user',
      content: [
        { type: 'text', text: 'Hello' }
      ]
    };
    expect(Array.isArray(message.content)).toBe(true);
  });

  it('should allow only user and assistant roles', () => {
    const userMessage: AnthropicMessage = { role: 'user', content: 'Hi' };
    const assistantMessage: AnthropicMessage = { role: 'assistant', content: 'Hello' };

    expect(userMessage.role).toBe('user');
    expect(assistantMessage.role).toBe('assistant');
  });
});

describe('AnthropicTool types', () => {
  it('should define tool with name', () => {
    const tool: AnthropicTool = {
      name: 'search',
      description: 'Search the web',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string' }
        }
      }
    };
    expect(tool.name).toBe('search');
    expect(tool.input_schema).toBeDefined();
  });

  it('should allow minimal tool definition', () => {
    const tool: AnthropicTool = {
      name: 'minimal'
    };
    expect(tool.name).toBe('minimal');
  });
});

describe('AnthropicRequest types', () => {
  it('should define valid request structure', () => {
    const request: AnthropicRequest = {
      model: 'glm-4.7',
      messages: [
        { role: 'user', content: 'Hello' }
      ],
      max_tokens: 1000,
      temperature: 0.7,
      stream: true
    };
    expect(request.model).toBe('glm-4.7');
    expect(request.max_tokens).toBe(1000);
  });

  it('should allow optional fields to be undefined', () => {
    const request: AnthropicRequest = {
      model: 'glm-4.7',
      messages: [
        { role: 'user', content: 'Hello' }
      ]
    };
    expect(request.max_tokens).toBeUndefined();
    expect(request.temperature).toBeUndefined();
    expect(request.stream).toBeUndefined();
  });

  it('should include tools when provided', () => {
    const request: AnthropicRequest = {
      model: 'glm-4.7',
      messages: [{ role: 'user', content: 'Search for something' }],
      tools: [
        { name: 'search', description: 'Search tool' }
      ]
    };
    expect(request.tools).toHaveLength(1);
  });
});

describe('ProviderKey types', () => {
  it('should allow all valid provider keys', () => {
    const providers: ProviderKey[] = ['openai', 'openrouter', 'gemini', 'glm', 'anthropic', 'minimax'];
    providers.forEach(provider => {
      expect(provider).toBeDefined();
    });
  });
});

describe('ProviderModel types', () => {
  it('should define valid provider model structure', () => {
    const pm: ProviderModel = {
      provider: 'openai',
      model: 'gpt-4o'
    };
    expect(pm.provider).toBe('openai');
    expect(pm.model).toBe('gpt-4o');
  });

  it('should work with all provider types', () => {
    const models: ProviderModel[] = [
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
      { provider: 'gemini', model: 'gemini-1.5-pro' },
      { provider: 'glm', model: 'glm-4.7' },
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'minimax', model: 'MiniMax-M2.1' }
    ];
    expect(models).toHaveLength(6);
  });
});
