import { describe, it, expect } from 'vitest';
import { parseProviderModel, toPlainText, toOpenAIMessages, toGeminiContents } from './map';
import type { AnthropicMessage, ProviderModel } from './types';

describe('parseProviderModel', () => {
  it('should parse provider:model format', () => {
    const result = parseProviderModel('openai:gpt-4o');
    expect(result).toEqual({ provider: 'openai', model: 'gpt-4o' });
  });

  it('should parse provider/model format', () => {
    const result = parseProviderModel('openrouter/meta-llama/llama-3.1-70b');
    expect(result).toEqual({ provider: 'openrouter', model: 'meta-llama/llama-3.1-70b' });
  });

  it('should default to glm when no prefix and no defaults', () => {
    const result = parseProviderModel('glm-4.7');
    expect(result).toEqual({ provider: 'glm', model: 'glm-4.7' });
  });

  it('should use defaults when no prefix', () => {
    const defaults: ProviderModel = { provider: 'anthropic', model: 'claude-3-5-sonnet' };
    const result = parseProviderModel('some-model', defaults);
    expect(result).toEqual(defaults);
  });

  it('should use defaults for unrecognized prefix', () => {
    const defaults: ProviderModel = { provider: 'openai', model: 'gpt-4o' };
    const result = parseProviderModel('unknown:model-name', defaults);
    expect(result).toEqual(defaults);
  });

  it('should throw error when no model and no defaults', () => {
    expect(() => parseProviderModel('')).toThrow("Missing 'model' in request");
  });

  it('should handle case-insensitive provider prefixes', () => {
    const result = parseProviderModel('OPENAI:gpt-4o');
    expect(result).toEqual({ provider: 'openai', model: 'gpt-4o' });
  });

  it('should handle all valid provider prefixes', () => {
    const providers = ['openai', 'openrouter', 'gemini', 'glm', 'anthropic', 'minimax'] as const;

    providers.forEach(provider => {
      const result = parseProviderModel(`${provider}:test-model`);
      expect(result.provider).toBe(provider);
      expect(result.model).toBe('test-model');
    });
  });
});

describe('toPlainText', () => {
  it('should return string content as-is', () => {
    expect(toPlainText('Hello world')).toBe('Hello world');
  });

  it('should extract text from text content blocks', () => {
    const content: AnthropicMessage['content'] = [
      { type: 'text', text: 'Hello ' },
      { type: 'text', text: 'world' }
    ];
    expect(toPlainText(content)).toBe('Hello world');
  });

  it('should convert tool results to string', () => {
    const content: AnthropicMessage['content'] = [
      { type: 'tool_result', tool_use_id: '123', content: 'tool output' }
    ];
    expect(toPlainText(content)).toBe('tool output');
  });

  it('should handle mixed content types', () => {
    const content: AnthropicMessage['content'] = [
      { type: 'text', text: 'Hello ' },
      { type: 'tool_result', tool_use_id: '123', content: 'world' }
    ];
    expect(toPlainText(content)).toBe('Hello world');
  });

  it('should ignore non-text blocks', () => {
    const content: AnthropicMessage['content'] = [
      { type: 'text', text: 'Hello ' },
      { type: 'tool_use', id: '123', name: 'test', input: {} }
    ];
    expect(toPlainText(content)).toBe('Hello ');
  });
});

describe('toOpenAIMessages', () => {
  it('should convert Anthropic messages to OpenAI format', () => {
    const messages: AnthropicMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];
    const result = toOpenAIMessages(messages);
    expect(result).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ]);
  });

  it('should handle complex content blocks', () => {
    const messages: AnthropicMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is ' },
          { type: 'text', text: '2+2?' }
        ]
      }
    ];
    const result = toOpenAIMessages(messages);
    expect(result).toEqual([
      { role: 'user', content: 'What is 2+2?' }
    ]);
  });
});

describe('toGeminiContents', () => {
  it('should convert Anthropic messages to Gemini format', () => {
    const messages: AnthropicMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];
    const result = toGeminiContents(messages);
    expect(result).toEqual([
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Hi there!' }] }
    ]);
  });

  it('should map assistant role to model', () => {
    const messages: AnthropicMessage[] = [
      { role: 'assistant', content: 'Response' }
    ];
    const result = toGeminiContents(messages);
    expect(result[0].role).toBe('model');
  });
});
