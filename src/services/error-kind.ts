// NIB-M-ERROR-KIND — stub.

export type LLMErrorKind =
  | 'auth'
  | 'invalid_request'
  | 'rate_limit'
  | 'overloaded'
  | 'transient_provider'
  | 'provider_protocol'
  | 'response_parse'
  | 'timeout'
  | 'aborted'
  | 'silent_truncation'
  | 'content_filter';

export const ALL_LLM_ERROR_KINDS: readonly LLMErrorKind[] = [
  'auth',
  'invalid_request',
  'rate_limit',
  'overloaded',
  'transient_provider',
  'provider_protocol',
  'response_parse',
  'timeout',
  'aborted',
  'silent_truncation',
  'content_filter',
] as const;

export function isRetriableKind(_kind: LLMErrorKind): boolean {
  throw new Error('Not implemented');
}
