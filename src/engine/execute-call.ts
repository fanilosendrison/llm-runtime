// NIB-M-EXECUTE-CALL — stub only. Internal (not exported from index).

import type { ProviderBinding } from '../bindings/types.js';
import type { Clock } from '../infra/clock.js';
import type {
  AdapterConfig,
  LLMLogger,
  LLMRequest,
  LLMResponse,
  ProviderLongId,
} from '../types.js';

export interface ExecuteCallContext {
  readonly binding: ProviderBinding;
  readonly config: AdapterConfig;
  readonly provider: ProviderLongId;
  readonly clock: Clock;
  readonly logger: LLMLogger;
  readonly createCallId: () => string;
  readonly getSnapshot: () => ReturnType<ProviderBinding['readRateLimitHeaders']>;
  readonly setSnapshot: (snapshot: ReturnType<ProviderBinding['readRateLimitHeaders']>) => void;
  readonly fetchImpl?: typeof fetch;
}

export interface ExecuteCallStatsDelta {
  readonly succeeded: boolean;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly durationMs: number;
}

export async function executeCall(
  _request: LLMRequest,
  _signal: AbortSignal | undefined,
  _ctx: ExecuteCallContext,
): Promise<{ response: LLMResponse; delta: ExecuteCallStatsDelta }> {
  throw new Error('Not implemented');
}
