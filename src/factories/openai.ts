// NIB-M-FACTORIES §4 — OpenAI adapter factory.

import { openaiBinding } from '../bindings/openai.js';
import { executeCall } from '../engine/execute-call.js';
import { createCallId } from '../infra/call-id.js';
import { defaultClock } from '../infra/clock.js';
import { resolveLogger } from '../infra/logger.js';
import { createStats, readOnlyView } from '../infra/stats.js';
import type { RateLimitSnapshot } from '../services/throttle-resolver.js';
import type { AdapterConfig, LLMRequest, LLMResponse, ProviderAdapter } from '../types.js';

export function createOpenAIAdapter(config: AdapterConfig): ProviderAdapter {
  const { providerOptions, logging, integrity, ...cloneable } = config;
  const frozenConfig: AdapterConfig = {
    ...structuredClone(cloneable),
    ...(integrity !== undefined ? { integrity: { ...integrity } } : {}),
    ...(logging !== undefined ? { logging: { ...logging } } : {}),
    ...(providerOptions !== undefined ? { providerOptions: { ...providerOptions } } : {}),
  };
  const logger = resolveLogger(frozenConfig.logging);
  const stats = createStats();
  let snapshot: RateLimitSnapshot | null = null;

  async function call(request: LLMRequest, signal?: AbortSignal): Promise<LLMResponse> {
    const { response, delta } = await executeCall(request, signal, {
      binding: openaiBinding,
      config: frozenConfig,
      provider: 'openai',
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
    provider: 'openai',
    model: frozenConfig.model,
    stats: readOnlyView(stats),
    call,
  };
}
