// NIB-M-TOKEN-ESTIMATOR — stub only.

import type { LLMMessage } from '../types.js';
import type { RateLimitSnapshot } from './throttle-resolver.js';

export function estimateCallTokens(
  _messages: readonly LLMMessage[],
  _snapshot: RateLimitSnapshot | null,
  _maxTokens: number | undefined,
): number {
  throw new Error('Not implemented');
}
