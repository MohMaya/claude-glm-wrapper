// Type augmentations for Fastify and other external modules
// This file consolidates all module augmentations in one place

/**
 * FastifyReply raw type augmentation
 * The raw property is not fully typed in Fastify but is needed for SSE streaming
 */
declare module "fastify" {
  interface FastifyReply {
    raw: {
      setHeader(name: string, value: string): void;
      write(chunk: Uint8Array | string): boolean;
      end(): void;
      flushHeaders?(): void;
    };
  }
}
