// @vegacorp/llm-runtime — public surface (NIB-T §26.1 C-GL-01).
// C-GL-02 lists internals NOT to re-export: executeCall, executeEmbedding,
// CanonicalHttpRequest, ParsedProviderResponse, ProviderErrorSignal,
// RateLimitSnapshot, ProviderBinding, EmbeddingBinding, ProviderQuirks, clock, ulid.

// ───────────────────────── Types ─────────────────────────
export type {
  LLMMessage,
  LLMRole,
  LLMRequest,
  LLMResponse,
  LLMUsage,
  LLMSanitizationInfo,
  LLMIntegrityInfo,
  TerminationReason,
  ProviderLongId,
  AdapterStats,
  AdapterConfig,
  EmbeddingAdapterConfig,
  ProviderAdapter,
  EmbeddingAdapter,
  RetryPolicy,
  TimeoutPolicy,
  SanitizationPolicy,
  IntegrityPolicy,
  LoggingPolicy,
  LLMLogger,
  LLMEvent,
} from './types.js';

// ───────────────────────── Error kinds ─────────────────────────
export { isRetriableKind, ALL_LLM_ERROR_KINDS } from './services/error-kind.js';
export type { LLMErrorKind } from './services/error-kind.js';

// ───────────────────────── Errors (taxonomy) ─────────────────────────
export {
  LLMRuntimeError,
  AuthError,
  InvalidRequestError,
  RateLimitError,
  OverloadedError,
  TransientProviderError,
  ProviderProtocolError,
  ResponseParseError,
  TimeoutError,
  AbortedError,
  SilentTruncationError,
  ContentFilterError,
} from './errors/index.js';

// ───────────────────────── Factories ─────────────────────────
export { createAnthropicAdapter } from './factories/anthropic.js';
export { createOpenAIAdapter } from './factories/openai.js';
export {
  createOpenAICompatibleAdapter,
} from './factories/openai-compatible.js';
export type { OpenAICompatibleAdapterConfig } from './factories/openai-compatible.js';
export { createGoogleAdapter } from './factories/google.js';
export { createOpenAIEmbeddingAdapter } from './factories/openai-embeddings.js';

// ───────────────────────── Helpers ─────────────────────────
export { buildSimplePrompt } from './factories/build-simple-prompt.js';
