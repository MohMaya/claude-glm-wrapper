export function createSSEMessage(event: string, data: any) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function createStartMessage(model: string) {
  const id = `msg_${Date.now()}`;
  return (
    createSSEMessage("message_start", {
      type: "message_start",
      message: {
        id,
        type: "message",
        role: "assistant",
        model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 }
      }
    }) +
    createSSEMessage("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" }
    })
  );
}

export function createDelta(text: string) {
  if (!text) return "";
  return createSSEMessage("content_block_delta", {
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text }
  });
}

export function createStopMessage() {
  return (
    createSSEMessage("content_block_stop", { type: "content_block_stop", index: 0 }) +
    createSSEMessage("message_delta", {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 0 }
    }) +
    createSSEMessage("message_stop", { type: "message_stop" })
  );
}

export class ApiError extends Error {
  constructor(public override message: string, public statusCode: number = 500) {
    super(message);
  }
}

export function parseErrorResponse(text: string): string {
  try {
    const json = JSON.parse(text);
    if (json.error?.message) return json.error.message;
    if (json.message) return json.message;
    if (json.error) return typeof json.error === "string" ? json.error : JSON.stringify(json.error);
  } catch {}
  return text;
}

// Convert an async generator to a ReadableStream
export function toReadableStream<T>(gen: AsyncGenerator<T>): ReadableStream<T> {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await gen.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    cancel() {
      gen.return(undefined);
    }
  });
}
