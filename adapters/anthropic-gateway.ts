// Main Fastify server that routes requests by provider prefix
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { parseProviderModel, warnIfTools } from "./map.js";
import type { AnthropicRequest, ProviderModel } from "./types.js";
import { chatOpenAI } from "./providers/openai.js";
import { chatOpenRouter } from "./providers/openrouter.js";
import { chatGemini } from "./providers/gemini.js";
import { passThrough } from "./providers/anthropic-pass.js";
import { setSSEHeaders, ApiError } from "./utils.js";
import { config } from "dotenv";
import { join } from "path";
import { homedir } from "os";
// FastifyReply raw type is augmented in types.d.ts

// Load .env from ~/.claude-proxy/.env
const envPath = join(homedir(), ".claude-proxy", ".env");
config({ path: envPath });

const PORT = Number(process.env.CLAUDE_PROXY_PORT || 17870);

let active: ProviderModel | null = null;

const fastify = Fastify({ logger: false });

// Configure rate limiting
await fastify.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: "1 minute",
  errorResponseBuilder: (request, context) => {
    return {
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${context.after}`,
      retryAfter: context.after
    };
  }
});

// Schema for request validation
const messagesBodySchema = {
  type: "object",
  required: ["model", "messages"],
  properties: {
    model: { type: "string", minLength: 1 },
    messages: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["role", "content"],
        properties: {
          role: { type: "string", enum: ["user", "assistant", "system"] },
          content: { type: ["string", "array"] }
        }
      }
    },
    max_tokens: { type: "integer", minimum: 1 },
    temperature: { type: "number", minimum: 0, maximum: 2 },
    stream: { type: "boolean" },
    tools: { type: "array" },
    system: { type: "string" }
  },
  additionalProperties: true
};

// Health check endpoint
fastify.get("/healthz", async () => ({
  ok: true,
  active: active ?? { provider: "glm", model: "auto" }
}));

// Status endpoint (shows current active provider/model)
fastify.get("/_status", async () => {
  return active ?? { provider: "glm", model: "glm-4.7" };
});

// Main messages endpoint - routes by model prefix
fastify.post("/v1/messages", {
  schema: {
    body: messagesBodySchema
  }
}, async (req, res) => {
  try {
    const body = req.body as AnthropicRequest;
    const defaults = active ?? undefined;
    const { provider, model } = parseProviderModel(body.model, defaults);

    // Warn if using tools with providers that may not support them
    warnIfTools(body, provider);

    active = { provider, model };

    // Validate API keys BEFORE setting headers
    if (provider === "openai") {
      const key = process.env.OPENAI_API_KEY;
      if (!key) {
        throw apiError(401, "OPENAI_API_KEY not set in ~/.claude-proxy/.env");
      }
      setSSEHeaders(res);
      return chatOpenAI(res, body, model, key);
    }

    if (provider === "openrouter") {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key) {
        throw apiError(401, "OPENROUTER_API_KEY not set in ~/.claude-proxy/.env");
      }
      setSSEHeaders(res);
      return chatOpenRouter(res, body, model, key);
    }

    if (provider === "gemini") {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw apiError(401, "GEMINI_API_KEY not set in ~/.claude-proxy/.env");
      }
      setSSEHeaders(res);
      return chatGemini(res, body, model, key);
    }

    if (provider === "anthropic") {
      const base = process.env.ANTHROPIC_UPSTREAM_URL;
      const key = process.env.ANTHROPIC_API_KEY;
      if (!base || !key) {
        throw apiError(
          500,
          "ANTHROPIC_UPSTREAM_URL and ANTHROPIC_API_KEY not set in ~/.claude-proxy/.env"
        );
      }
      // Don't set headers here - passThrough will do it after validation
      return passThrough({
        res,
        body,
        model,
        baseUrl: base,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": process.env.ANTHROPIC_VERSION || "2023-06-01"
        }
      });
    }

    if (provider === "minimax") {
      const minimaxBase = process.env.MINIMAX_UPSTREAM_URL || "https://api.minimax.io/anthropic";
      const minimaxKey = process.env.MINIMAX_API_KEY;
      if (!minimaxKey) {
        throw apiError(
          500,
          "MINIMAX_API_KEY not set in ~/.claude-proxy/.env. Run: ccx --setup"
        );
      }
      // Don't set headers here - passThrough will do it after validation
      return passThrough({
        res,
        body,
        model,
        baseUrl: minimaxBase,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${minimaxKey}`,
          "anthropic-version": process.env.ANTHROPIC_VERSION || "2023-06-01"
        }
      });
    }

    // Default: glm (Z.AI)
    const glmBase = process.env.GLM_UPSTREAM_URL;
    const glmKey = process.env.ZAI_API_KEY || process.env.GLM_API_KEY;
    if (!glmBase || !glmKey) {
      throw apiError(
        500,
        "GLM_UPSTREAM_URL and ZAI_API_KEY not set in ~/.claude-proxy/.env. Run: ccx --setup"
      );
    }
    // Don't set headers here - passThrough will do it after validation
    return passThrough({
      res,
      body,
      model,
      baseUrl: glmBase,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${glmKey}`,
        "anthropic-version": process.env.ANTHROPIC_VERSION || "2023-06-01"
      }
    });
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    return res.code(status).send({ error: e?.message || "proxy error" });
  }
});

function apiError(status: number, message: string): ApiError {
  return new ApiError(message, status);
}

fastify
  .listen({ port: PORT, host: "127.0.0.1" })
  .then(() => {
    console.log(`[ccx] Proxy listening on http://127.0.0.1:${PORT}`);
    console.log(`[ccx] Configure API keys in: ${envPath}`);
  })
  .catch((err) => {
    console.error("[ccx] Failed to start proxy:", err.message);
    process.exit(1);
  });
