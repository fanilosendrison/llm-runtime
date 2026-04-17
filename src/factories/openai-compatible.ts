// NIB-M-FACTORIES §4 — OpenAI-compatible adapter factory (parameterized).

import { createOpenAICompatibleBinding } from '../bindings/openai-compatible.js';
import type { OpenAICompatibleProvider } from '../bindings/types.js';
import { executeCall } from '../engine/execute-call.js';
import { InvalidRequestError } from '../errors/index.js';
import { createCallId } from '../infra/call-id.js';
import { defaultClock } from '../infra/clock.js';
import { resolveLogger } from '../infra/logger.js';
import { createStats, readOnlyView } from '../infra/stats.js';
import type { RateLimitSnapshot } from '../services/throttle-resolver.js';
import type { AdapterConfig, LLMRequest, LLMResponse, ProviderAdapter } from '../types.js';

export interface OpenAICompatibleAdapterConfig extends AdapterConfig {
  readonly provider: OpenAICompatibleProvider;
}

const ALLOWED: ReadonlySet<OpenAICompatibleProvider> = new Set<OpenAICompatibleProvider>([
  'deepseek',
  'mistral',
  'groq',
  'together',
  'ollama',
]);

export function createOpenAICompatibleAdapter(
  config: OpenAICompatibleAdapterConfig,
): ProviderAdapter {
  if (!ALLOWED.has(config.provider)) {
    throw new InvalidRequestError({
      message: `unsupported openai-compatible provider: ${String(config.provider)}`,
    });
  }
  const { provider, providerOptions, logging, integrity, ...cloneable } = config;
  const frozenConfig: AdapterConfig = {
    ...structuredClone(
      cloneable as Omit<AdapterConfig, 'providerOptions' | 'logging' | 'integrity'>,
    ),
    ...(integrity !== undefined ? { integrity: { ...integrity } } : {}),
    ...(logging !== undefined ? { logging: { ...logging } } : {}),
    ...(providerOptions !== undefined ? { providerOptions: { ...providerOptions } } : {}),
  };
  const binding = createOpenAICompatibleBinding(provider);
  const logger = resolveLogger(frozenConfig.logging);
  const stats = createStats();
  let snapshot: RateLimitSnapshot | null = null;

  async function call(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    const { response, delta } = await executeCall(request, signal, {
      binding,
      config: frozenConfig,
      provider,
      clock: defaultClock,
      logger,
      createCallId,
      getSnapshot: () => snapshot,
      setSnapshot: (s) => {
        snapshot = s;
      },
    });
    if (delta.succeeded) {
      stats.totalCalls += 1;
      if (delta.inputTokens !== undefined) stats.totalInputTokens += delta.inputTokens;
      if (delta.outputTokens !== undefined) stats.totalOutputTokens += delta.outputTokens;
      stats.totalDurationMs += delta.durationMs;
    }
    return response;
  }

  return {
    provider,
    model: frozenConfig.model,
    stats: readOnlyView(stats),
    call,
  };
}
