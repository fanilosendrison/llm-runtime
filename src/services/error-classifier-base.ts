// NIB-M-ERROR-CLASSIFIER-BASE — stub only.

import type { LLMRuntimeError } from '../errors/index.js';

export type NetworkErrorKind = 'dns' | 'connection' | 'reset' | 'unknown';

export interface ProviderErrorSignal {
  readonly aborted: boolean;
  readonly timeout: boolean;
  readonly headers: Record<string, string>;
  readonly status?: number;
  readonly bodyText?: string;
  readonly networkErrorKind?: NetworkErrorKind;
  readonly timeoutMs?: number;
  readonly cause?: unknown;
}

export function classifyErrorBase(_signal: ProviderErrorSignal): LLMRuntimeError {
  throw new Error('Not implemented');
}
