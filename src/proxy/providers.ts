import { createParser } from "eventsource-parser";
import type { AnthropicRequest } from "./types";
import { toOpenAIMessages, toGeminiContents } from "./map";
import { createStartMessage, createDelta, createStopMessage, ApiError } from "./utils";

// OpenAI
export async function* streamOpenAI(
  body: AnthropicRequest,
  model: string,
  key: string,
  baseUrl: string
) {
  const url = `${baseUrl}/chat/completions`;
  const reqBody: any = {
    model,
    messages: toOpenAIMessages(body.messages),
    stream: true,
    temperature: body.temperature ?? 0.7,
    max_tokens: body.max_tokens
  };
  
  if (body.tools?.length) reqBody.tools = body.tools;

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(reqBody)
  });

  if (!resp.ok) throw new ApiError(await resp.text(), resp.status);
  if (!resp.body) throw new ApiError("No response body", 500);

  yield createStartMessage(model);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = ""; // Store partial chunks if needed, but parser handles it

  const parser = createParser(((event: any) => {
    if (event.type !== "event") return;
    const data = event.data;
    if (!data || data === "[DONE]") return;
    try {
      const json = JSON.parse(data);
      const chunk = json.choices?.[0]?.delta?.content ?? "";
      if (chunk) buffer += createDelta(chunk);
    } catch {}
  }) as any);

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value));
    if (buffer) {
      yield buffer;
      buffer = "";
    }
  }
  
  yield createStopMessage();
}

// Gemini
export async function* streamGemini(
  body: AnthropicRequest,
  model: string,
  key: string,
  baseUrl: string
) {
  const url = `${baseUrl}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${key}`;
  const reqBody = {
    contents: toGeminiContents(body.messages),
    generationConfig: {
      temperature: body.temperature ?? 0.7,
      maxOutputTokens: body.max_tokens
    }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody)
  });

  if (!resp.ok) throw new ApiError(await resp.text(), resp.status);
  if (!resp.body) throw new ApiError("No response body", 500);

  yield createStartMessage(model);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const parser = createParser(((event: any) => {
    if (event.type !== "event") return;
    const data = event.data;
    if (!data) return;
    try {
      const json = JSON.parse(data);
      const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
      if (text) buffer += createDelta(text);
    } catch {}
  }) as any);

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value));
    if (buffer) {
      yield buffer;
      buffer = "";
    }
  }

  yield createStopMessage();
}

// PassThrough (GLM, Anthropic, Minimax)
export async function* streamPassThrough(
  body: AnthropicRequest,
  baseUrl: string,
  headers: Record<string, string>
) {
  const url = `${baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl}/v1/messages`;
  body.stream = true;

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!resp.ok) throw new ApiError(await resp.text(), resp.status);
  if (!resp.body) throw new ApiError("No response body", 500);

  const reader = resp.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    yield value;
  }
}
