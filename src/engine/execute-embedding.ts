// NIB-M-EXECUTE-EMBEDDING — stub only. Internal (not exported from index).

import type { EmbeddingBinding } from '../bindings/types.js';
import type { Clock } from '../infra/clock.js';
import type {
  EmbeddingAdapterConfig,
  LLMLogger,
  ProviderLongId,
} from '../types.js';

export interface ExecuteEmbeddingContext {
  readonly binding: EmbeddingBinding;
  readonly config: EmbeddingAdapterConfig;
  readonly provider: ProviderLongId;
  readonly clock: Clock;
  readonly logger: LLMLogger;
  readonly createCallId: () => string;
  readonly fetchImpl?: typeof fetch;
}

export interface ExecuteEmbeddingStatsDelta {
  readonly succeeded: boolean;
  readonly durationMs: number;
}

export async function executeEmbedding(
  _texts: readonly string[],
  _signal: AbortSignal | undefined,
  _ctx: ExecuteEmbeddingContext,
): Promise<{ embeddings: number[][]; delta: ExecuteEmbeddingStatsDelta }> {
  throw new Error('Not implemented');
}
