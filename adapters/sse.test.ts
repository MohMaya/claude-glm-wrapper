import { describe, it, expect, vi } from 'vitest';
import { initSSE, sendEvent, endSSE, startAnthropicMessage, deltaText, stopAnthropicMessage } from './sse';

// Mock FastifyReply - share mock functions between .raw and top-level
const createMockReply = () => {
  const mockWrite = vi.fn();
  const mockEnd = vi.fn();
  const mockSetHeader = vi.fn();
  const mockFlushHeaders = vi.fn();

  const mockReply = {
    write: mockWrite,
    end: mockEnd,
    setHeader: mockSetHeader,
    flushHeaders: mockFlushHeaders
  };

  // raw property points to same object for SSE writes
  mockReply.raw = mockReply as any;

  return mockReply as any;
};

describe('SSE Utilities', () => {
  describe('initSSE', () => {
    it('should set correct SSE headers', () => {
      const mockReply = createMockReply() as any;

      initSSE(mockReply);

      expect(mockReply.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockReply.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache, no-transform');
      expect(mockReply.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockReply.flushHeaders).toHaveBeenCalled();
    });
  });

  describe('sendEvent', () => {
    it('should send properly formatted SSE event', () => {
      const mockReply = createMockReply() as any;

      sendEvent(mockReply, 'message_start', { id: 'test-123' });

      expect(mockReply.write).toHaveBeenCalledWith('event: message_start\n');
      expect(mockReply.write).toHaveBeenCalledWith('data: {"id":"test-123"}\n\n');
    });
  });

  describe('endSSE', () => {
    it('should send done event and end response', () => {
      const mockReply = createMockReply() as any;

      endSSE(mockReply);

      expect(mockReply.write).toHaveBeenCalledWith('event: done\n');
      expect(mockReply.write).toHaveBeenCalledWith('data: {}\n\n');
      expect(mockReply.end).toHaveBeenCalled();
    });
  });

  describe('startAnthropicMessage', () => {
    it('should send message_start, content_block_start events', () => {
      const mockReply = createMockReply() as any;

      startAnthropicMessage(mockReply, 'glm-4.7');

      // sendEvent is called twice (message_start, content_block_start)
      // each sendEvent calls write twice (event line, data line) = 4 total
      expect(mockReply.write).toHaveBeenCalledTimes(4);

      // Check message_start event (first call)
      const messageStartCall = mockReply.write.mock.calls[0][0];
      expect(messageStartCall).toContain('event: message_start');

      // Check message_start data (second call)
      const messageStartData = mockReply.write.mock.calls[1][0];
      expect(messageStartData).toContain('"model":"glm-4.7"');
      expect(messageStartData).toContain('"role":"assistant"');

      // Check content_block_start event (third call)
      const blockStartCall = mockReply.write.mock.calls[2][0];
      expect(blockStartCall).toContain('event: content_block_start');

      // Check content_block_start data (fourth call)
      const blockStartData = mockReply.write.mock.calls[3][0];
      expect(blockStartData).toContain('"type":"text"');
    });
  });

  describe('deltaText', () => {
    it('should skip empty text', () => {
      const mockReply = createMockReply() as any;

      deltaText(mockReply, '');

      expect(mockReply.write).not.toHaveBeenCalled();
    });

    it('should send text delta event', () => {
      const mockReply = createMockReply() as any;

      deltaText(mockReply, 'Hello world');

      expect(mockReply.write).toHaveBeenCalledWith('event: content_block_delta\n');
      expect(mockReply.write).toHaveBeenCalledWith('data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello world"}}\n\n');
    });
  });

  describe('stopAnthropicMessage', () => {
    it('should send content_block_stop, message_delta, message_stop', () => {
      const mockReply = createMockReply() as any;

      stopAnthropicMessage(mockReply);

      // sendEvent is called 3 times (content_block_stop, message_delta, message_stop)
      // each sendEvent calls write twice (event line, data line) = 6 total
      expect(mockReply.write).toHaveBeenCalledTimes(6);

      const calls = mockReply.write.mock.calls.map((c: string[]) => c[0]);
      expect(calls[0]).toContain('event: content_block_stop');
      expect(calls[2]).toContain('event: message_delta');
      // calls[3] is the data line for message_delta which contains stop_reason
      expect(calls[3]).toContain('"stop_reason":"end_turn"');
      expect(calls[4]).toContain('event: message_stop');
    });
  });
});
