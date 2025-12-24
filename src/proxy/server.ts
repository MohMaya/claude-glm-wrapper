import { serve } from "bun";
import { parseProviderModel } from "./map";
import { streamOpenAI, streamGemini, streamPassThrough } from "./providers";
import { Config } from "../core/config";
import { AnthropicRequest } from "./types";

export function startProxyServer(config: Config, port: number = 17870) {
  return serve({
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
        const { provider, model } = parseProviderModel(body.model);
        
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
          return new Response(streamOpenAI(body, model, conf.apiKey, conf.baseUrl || "https://api.openai.com/v1"), { headers });
        }

        if (provider === "openrouter") {
          const conf = providers.openrouter;
          if (!conf?.apiKey) throw new Error("Missing OpenRouter API Key");
          return new Response(streamOpenAI(body, model, conf.apiKey, conf.baseUrl || "https://openrouter.ai/api/v1"), { headers });
        }

        if (provider === "gemini") {
          const conf = providers.gemini;
          if (!conf?.apiKey) throw new Error("Missing Gemini API Key");
          return new Response(streamGemini(body, model, conf.apiKey, conf.baseUrl || "https://generativelanguage.googleapis.com/v1beta"), { headers });
        }
        
        // Anthropic-compatible handlers (Passthrough)
        let baseUrl = "";
        let apiKey = "";
        let extraHeaders: Record<string, string> = {};

        if (provider === "anthropic") {
           const conf = providers.anthropic;
           if (!conf?.apiKey) throw new Error("Missing Anthropic API Key");
           baseUrl = conf.baseUrl || "https://api.anthropic.com";
           apiKey = conf.apiKey;
           extraHeaders["x-api-key"] = apiKey;
        } else if (provider === "minimax") {
           apiKey = config.minimaxApiKey || "";
           if (!apiKey) throw new Error("Missing Minimax API Key");
           baseUrl = "https://api.minimax.io/anthropic";
           extraHeaders["Authorization"] = `Bearer ${apiKey}`;
        } else {
           // GLM (Default)
           apiKey = config.zaiApiKey || "";
           if (!apiKey) throw new Error("Missing Z.AI API Key");
           baseUrl = "https://api.z.ai/api/anthropic";
           extraHeaders["Authorization"] = `Bearer ${apiKey}`;
        }

        const apiHeaders = {
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
            ...extraHeaders
        };

        return new Response(streamPassThrough(body, baseUrl, apiHeaders), { headers });

      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    },
  });
}
