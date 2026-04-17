// NIB-M-FACTORIES §6 — OpenAI Embeddings adapter factory.

import { openaiEmbeddingsBinding } from '../bindings/openai-embeddings.js';
import { executeEmbedding } from '../engine/execute-embedding.js';
import { createCallId } from '../infra/call-id.js';
import { defaultClock } from '../infra/clock.js';
import { resolveLogger } from '../infra/logger.js';
import { createStats, readOnlyView } from '../infra/stats.js';
import type { EmbeddingAdapter, EmbeddingAdapterConfig } from '../types.js';

export function createOpenAIEmbeddingAdapter(config: EmbeddingAdapterConfig): EmbeddingAdapter {
  const frozenConfig: EmbeddingAdapterConfig = { ...config };
  const logger = resolveLogger(frozenConfig.logging);
  const stats = createStats();

  async function embed(texts: readonly string[], signal?: AbortSignal): Promise<number[][]> {
    const { embeddings, delta } = await executeEmbedding(texts, signal, {
      binding: openaiEmbeddingsBinding,
      config: frozenConfig,
      provider: 'openai',
      clock: defaultClock,
      logger,
      createCallId,
    });
    if (delta.succeeded) {
      stats.totalCalls += 1;
      stats.totalDurationMs += delta.durationMs;
    }
    return embeddings;
  }

  return {
    provider: 'openai',
    model: frozenConfig.model,
    stats: readOnlyView(stats),
    embed,
  };
}
