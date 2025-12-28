import { createParser } from "eventsource-parser";
import type { AnthropicRequest } from "./types";
import { toOpenAIMessages, toGeminiContents } from "./map";
import { createStartMessage, createDelta, createStopMessage, ApiError, parseErrorResponse } from "./utils";
import { createLogger } from "../core/logger";

const logger = createLogger();
const MAX_BUFFER_SIZE = 65536;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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

  logger.debug("OpenAI request", { model, url });

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(reqBody)
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    logger.error("OpenAI API error", { status: resp.status, error: errorText });
    throw new ApiError(parseErrorResponse(errorText), resp.status);
  }
  if (!resp.body) throw new ApiError("No response body", 500);

  yield createStartMessage(model);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const parser = createParser(((event: any) => {
    if (event.type !== "event") return;
    const data = event.data;
    if (!data || data === "[DONE]") return;
    try {
      const json = JSON.parse(data);
      const chunk = json.choices?.[0]?.delta?.content ?? "";
      if (chunk) buffer += createDelta(chunk);
    } catch (err) {
      logger.warn("Failed to parse OpenAI chunk", { data, error: String(err) });
    }
  }) as any);

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value));
    if (buffer.length >= MAX_BUFFER_SIZE) {
      yield buffer;
      buffer = "";
    } else if (buffer) {
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

  logger.debug("Gemini request", { model, url });

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody)
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    logger.error("Gemini API error", { status: resp.status, error: errorText });
    throw new ApiError(parseErrorResponse(errorText), resp.status);
  }
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
    } catch (err) {
      logger.warn("Failed to parse Gemini chunk", { data, error: String(err) });
    }
  }) as any);

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value));
    if (buffer.length >= MAX_BUFFER_SIZE) {
      yield buffer;
      buffer = "";
    } else if (buffer) {
      yield buffer;
      buffer = "";
    }
  }

  yield createStopMessage();
}

// Minimax with retries
export async function* streamMinimax(
  body: AnthropicRequest,
  apiKey: string
) {
  const baseUrl = "https://api.minimax.io/anthropic";
  const url = `${baseUrl}/v1/messages`;
  
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
    "anthropic-version": "2023-06-01"
  };

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    logger.info("Minimax request", { model: body.model, attempt, maxAttempts: MAX_RETRIES });

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...body, stream: true })
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        logger.error("Minimax API error", { status: resp.status, error: errorText, attempt });
        throw new ApiError(parseErrorResponse(errorText), resp.status);
      }
      
      if (!resp.body) {
        logger.error("Minimax returned empty body", { attempt });
        throw new ApiError("No response body from Minimax", 500);
      }

      // Success - stream the response
      yield createStartMessage(body.model);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const parser = createParser(((event: any) => {
        if (event.type !== "event") return;
        const data = event.data;
        if (!data) return;
        try {
          const json = JSON.parse(data);
          
          // Handle different Minimax response formats
          const text = extractMinimaxText(json);
          if (text) {
            buffer += createDelta(text);
          }
        } catch (err) {
          logger.warn("Failed to parse Minimax chunk", { data, error: String(err) });
        }
      }) as any);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value));
        
        if (buffer.length >= MAX_BUFFER_SIZE) {
          yield buffer;
          buffer = "";
        } else if (buffer && buffer.length > 50) {
          yield buffer;
          buffer = "";
        }
      }

      yield createStopMessage();
      return; // Success, exit the retry loop
      
    } catch (err) {
      lastError = err as Error;
      logger.warn("Minimax request failed", { attempt, error: lastError.message });
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }

  // All retries exhausted
  logger.error("Minimax request failed after all retries", { error: lastError?.message });
  throw lastError || new ApiError("Minimax request failed", 500);
}

// Helper to extract text from various Minimax response formats
function extractMinimaxText(json: any): string {
  // Try standard Anthropic format
  let text = json?.delta?.text || "";
  if (text) return text;
  
  // Try OpenAI-style format
  text = json?.choices?.[0]?.delta?.content || "";
  if (text) return text;
  
  // Try raw content
  text = json?.content || json?.message?.content || "";
  if (text) return text;
  
  return "";
}

// GLM (pass-through with logging)
export async function* streamGLM(
  body: AnthropicRequest,
  apiKey: string
) {
  const baseUrl = "https://api.z.ai/api/anthropic";
  const url = `${baseUrl}/v1/messages`;
  
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
    "anthropic-version": "2023-06-01"
  };

  logger.debug("GLM request", { model: body.model });

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, stream: true })
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    logger.error("GLM API error", { status: resp.status, error: errorText });
    throw new ApiError(parseErrorResponse(errorText), resp.status);
  }
  if (!resp.body) throw new ApiError("No response body", 500);

  yield createStartMessage(body.model);

  const reader = resp.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    yield value;
  }

  yield createStopMessage();
}

// Anthropic (pass-through with logging)
export async function* streamAnthropic(
  body: AnthropicRequest,
  apiKey: string,
  baseUrl: string = "https://api.anthropic.com"
) {
  const url = `${baseUrl}/v1/messages`;
  
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01"
  };

  logger.debug("Anthropic request", { model: body.model, baseUrl });

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, stream: true })
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    logger.error("Anthropic API error", { status: resp.status, error: errorText });
    throw new ApiError(parseErrorResponse(errorText), resp.status);
  }
  if (!resp.body) throw new ApiError("No response body", 500);

  const reader = resp.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    yield value;
  }
}
