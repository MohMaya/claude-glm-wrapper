import { serve } from "bun";
import { parseProviderModel } from "./map";
import { streamOpenAI, streamGemini, streamMinimax, streamGLM, streamAnthropic } from "./providers";
import { toReadableStream } from "./utils";
import type { Config } from "../core/config";
import type { AnthropicRequest } from "./types";
import { createLogger } from "../core/logger";

const logger = createLogger();

export function startProxyServer(config: Config, port: number = 17870) {
  const server = serve({
    port,
    hostname: "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/healthz") return Response.json({ ok: true });
      if (req.method !== "POST" || url.pathname !== "/v1/messages") {
        return new Response("Not Found", { status: 404 });
      }

      try {
        const body = await req.json() as AnthropicRequest;
        logger.info("Incoming request", { model: body.model, messages: body.messages?.length });
        
        const { provider, model } = parseProviderModel(body.model);
        logger.debug("Routing request", { provider, model });
        
        const headers = {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        };

        const providers = config.providers;

        // OpenAI-compatible handlers
        if (provider === "openai") {
          const conf = providers.openai;
          if (!conf?.apiKey) throw new Error("Missing OpenAI API Key");
          logger.debug("Using OpenAI handler", { model, baseUrl: conf.baseUrl });
          return new Response(toReadableStream(streamOpenAI(body, model, conf.apiKey, conf.baseUrl || "https://api.openai.com/v1")), { headers });
        }

        if (provider === "openrouter") {
          const conf = providers.openrouter;
          if (!conf?.apiKey) throw new Error("Missing OpenRouter API Key");
          logger.debug("Using OpenRouter handler", { model, baseUrl: conf.baseUrl });
          return new Response(toReadableStream(streamOpenAI(body, model, conf.apiKey, conf.baseUrl || "https://openrouter.ai/api/v1")), { headers });
        }

        if (provider === "gemini") {
          const conf = providers.gemini;
          if (!conf?.apiKey) throw new Error("Missing Gemini API Key");
          logger.debug("Using Gemini handler", { model, baseUrl: conf.baseUrl });
          return new Response(toReadableStream(streamGemini(body, model, conf.apiKey, conf.baseUrl || "https://generativelanguage.googleapis.com/v1beta")), { headers });
        }
        
        // Minimax with retries
        if (provider === "minimax") {
          const apiKey = config.minimaxApiKey || "";
          if (!apiKey) {
            logger.error("Missing Minimax API Key");
            throw new Error("Missing Minimax API Key");
          }
          logger.debug("Using Minimax handler", { model });
          return new Response(toReadableStream(streamMinimax(body, apiKey)), { headers });
        }
        
        // Anthropic (native)
        if (provider === "anthropic") {
          const conf = providers.anthropic;
          if (!conf?.apiKey) throw new Error("Missing Anthropic API Key");
          logger.debug("Using Anthropic pass-through", { model, baseUrl: conf.baseUrl });
          return new Response(toReadableStream(streamAnthropic(body, conf.apiKey, conf.baseUrl || "https://api.anthropic.com")), { headers });
        }
        
        // GLM (default)
        const apiKey = config.zaiApiKey || "";
        if (!apiKey) {
          logger.error("Missing Z.AI API Key");
          throw new Error("Missing Z.AI API Key");
        }
        logger.debug("Using GLM handler", { model });
        return new Response(toReadableStream(streamGLM(body, apiKey)), { headers });

      } catch (e: any) {
        logger.error("Proxy error", { error: e.message, stack: e.stack });
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    },
  });

  const shutdown = () => {
    logger.info("Shutting down proxy server");
    server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}
