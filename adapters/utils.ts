// Shared utilities for provider adapters
import type { FastifyReply } from "fastify";
// FastifyReply raw type is augmented in types.d.ts

/**
 * Custom error with status code for API errors
 */
export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/**
 * Create an error with a specific HTTP status code
 */
export function withStatus(status: number, message: string): ApiError {
  return new ApiError(message, status);
}

/**
 * Safely extract text from a response body
 */
export async function safeText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return '<no-body>';
  }
}

/**
 * Set common SSE headers on a Fastify response
 */
export function setSSEHeaders(res: FastifyReply): void {
  res.raw.setHeader("Content-Type", "text/event-stream");
  res.raw.setHeader("Cache-Control", "no-cache, no-transform");
  res.raw.setHeader("Connection", "keep-alive");
  res.raw.flushHeaders?.();
}

/**
 * Parse error response and create appropriate error message
 */
export async function parseApiError(resp: Response): Promise<ApiError> {
  const text = await safeText(resp);
  const status = resp.status || 500;
  return new ApiError(`API error (${status}): ${text}`, status);
}

/**
 * Validate that required environment variables are set
 */
export function validateEnvVars(...vars: string[]): void {
  const missing = vars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new ApiError(
      `Missing required environment variables: ${missing.join(', ')}`,
      500
    );
  }
}
