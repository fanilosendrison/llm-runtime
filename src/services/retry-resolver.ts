// NIB-M-RETRY-RESOLVER — stubs only.

import type { LLMRuntimeError } from '../errors/index.js';
import type { RetryPolicy } from '../types.js';

export type RetryDecisionReason =
  | 'fatal_auth'
  | 'fatal_invalid_request'
  | 'fatal_parse_error'
  | 'fatal_content_filter'
  | 'fatal_aborted'
  | 'fatal_protocol'
  | 'fatal_truncation'
  | 'retry_exhausted'
  | 'transient_rate_limit'
  | 'transient_overloaded'
  | 'transient_provider'
  | 'transient_timeout'
  | 'transient_unknown';

export type RetryDecision =
  | { readonly retry: false; readonly reason: RetryDecisionReason }
  | { readonly retry: true; readonly delayMs: number; readonly reason: RetryDecisionReason };

export function resolveRetryDecision(
  _error: LLMRuntimeError | Error,
  _attempt: number,
  _headers: Record<string, string>,
  _policy: RetryPolicy,
): RetryDecision {
  throw new Error('Not implemented');
}

export function parseRetryAfter(_headers: Record<string, string>): number | undefined {
  throw new Error('Not implemented');
}
