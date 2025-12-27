import type { CircuitState } from "../types";
import { providerRegistry } from "./registry";
import { telemetry } from "./telemetry";
import { createLogger } from "./logger";

const logger = createLogger();

const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_TIMEOUT = 30000;

export class CircuitBreaker {
  private states: Map<string, CircuitState> = new Map();
  private static instance: CircuitBreaker | null = null;

  private constructor() {}

  static getInstance(): CircuitBreaker {
    if (!CircuitBreaker.instance) {
      CircuitBreaker.instance = new CircuitBreaker();
    }
    return CircuitBreaker.instance;
  }

  private getState(provider: string): CircuitState {
    let state = this.states.get(provider);
    if (!state) {
      state = {
        provider,
        state: "closed",
        failures: 0,
        lastFailure: null
      };
      this.states.set(provider, state);
    }
    return state;
  }

  isOpen(provider: string): boolean {
    const state = this.getState(provider);
    if (state.state === "open") {
      const timeSinceFailure = Date.now() - (state.lastFailure || 0);
      if (timeSinceFailure > CIRCUIT_TIMEOUT) {
        state.state = "half-open";
        logger.debug("Circuit breaker transitioning to half-open", { provider });
        return false;
      }
      return true;
    }
    return false;
  }

  isClosed(provider: string): boolean {
    return this.getState(provider).state === "closed";
  }

  async execute<T>(
    provider: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const state = this.getState(provider);

    if (state.state === "open") {
      const timeSinceFailure = Date.now() - (state.lastFailure || 0);
      if (timeSinceFailure > CIRCUIT_TIMEOUT) {
        state.state = "half-open";
        logger.debug("Circuit breaker transitioning to half-open", { provider });
      } else {
        const fallbackProvider = this.getFallbackProvider(provider);
        if (fallbackProvider) {
          logger.warn("Circuit open, falling back", { from: provider, to: fallbackProvider });
          telemetry.trackEvent({
            type: "fallback",
            fromProvider: provider,
            toProvider: fallbackProvider,
            reason: "circuit_open"
          });
          return this.execute(fallbackProvider, fn);
        }
        throw new CircuitOpenError(provider, CIRCUIT_TIMEOUT - timeSinceFailure);
      }
    }

    try {
      const result = await fn();
      this.recordSuccess(provider);
      return result;
    } catch (error) {
      this.recordFailure(provider, error as Error);
      throw error;
    }
  }

  private getFallbackProvider(currentProvider: string): string | null {
    const order = providerRegistry.getProviderOrder();
    const currentIndex = order.indexOf(currentProvider);

    for (let i = currentIndex + 1; i < order.length; i++) {
      const candidate = order[i];
      if (candidate && !this.isOpen(candidate) && !providerRegistry.isNative(candidate)) {
        return candidate;
      }
    }

    for (const provider of order) {
      if (provider !== currentProvider && !this.isOpen(provider) && !providerRegistry.isNative(provider)) {
        return provider;
      }
    }

    return null;
  }

  private recordSuccess(provider: string): void {
    const state = this.getState(provider);

    if (state.state === "half-open") {
      state.state = "closed";
      state.failures = 0;
      state.lastFailure = null;
      logger.debug("Circuit breaker closed", { provider });
    } else if (state.state === "closed" && state.failures > 0) {
      state.failures = Math.max(0, state.failures - 1);
    }
  }

  private recordFailure(provider: string, error: Error): void {
    const state = this.getState(provider);
    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= CIRCUIT_THRESHOLD && state.state !== "open") {
      state.state = "open";
      logger.warn("Circuit breaker opened", { provider, failures: state.failures });
    }
  }

  reset(provider: string): void {
    const state = this.getState(provider);
    state.state = "closed";
    state.failures = 0;
    state.lastFailure = null;
  }

  resetAll(): void {
    this.states.clear();
  }

  getStates(): CircuitState[] {
    return Array.from(this.states.values());
  }

  getStateInfo(provider: string): CircuitState {
    return this.getState(provider);
  }
}

export class CircuitOpenError extends Error {
  constructor(
    public readonly provider: string,
    public readonly retryAfterMs: number
  ) {
    super(`Circuit open for ${provider}. Retry after ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = "CircuitOpenError";
  }
}

export const circuitBreaker = CircuitBreaker.getInstance();
