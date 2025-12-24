// Pass-through adapter for Anthropic-compatible upstreams (Anthropic API and Z.AI GLM)
import { FastifyReply } from "fastify";
import { ApiError, safeText, setSSEHeaders } from "../utils.js";

type PassArgs = {
  res: FastifyReply;
  body: any;
  model: string;
  baseUrl: string;
  headers: Record<string, string>;
};

/**
 * Pass through requests to Anthropic-compatible APIs
 * This works for both:
 * - Anthropic's official API
 * - Z.AI's GLM API (Anthropic-compatible)
 */
export async function passThrough({ res, body, model, baseUrl, headers }: PassArgs) {
  const url = `${stripEndSlash(baseUrl)}/v1/messages`;

  // Ensure stream is true for Claude Code UX
  body.stream = true;

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!resp.ok || !resp.body) {
    const text = await safeText(resp);
    throw new ApiError(`Upstream error (${resp.status}): ${text}`, resp.status || 502);
  }

  // Pipe upstream SSE as-is (already in Anthropic format)
  setSSEHeaders(res);

  const reader = resp.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    res.raw.write(value);
  }
  res.raw.end();
}

function stripEndSlash(s: string) {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
