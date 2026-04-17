// NIB-M-ERRORS — stubs only. Structural field-init in constructor is not logic (I-8 taxonomy).

import type { LLMErrorKind } from '../services/error-kind.js';
import type { ProviderLongId } from '../types.js';

export interface LLMRuntimeErrorInit {
  readonly message?: string;
  readonly cause?: unknown;
  readonly callId?: string;
  readonly provider?: ProviderLongId;
  readonly model?: string;
  readonly attempts?: number;
}

export abstract class LLMRuntimeError extends Error {
  public abstract readonly kind: LLMErrorKind;
  public readonly callId?: string;
  public readonly provider?: ProviderLongId;
  public readonly model?: string;
  public readonly attempts?: number;

  constructor(init: LLMRuntimeErrorInit = {}) {
    super(
      init.message ?? 'LLMRuntimeError',
      init.cause !== undefined ? { cause: init.cause } : undefined,
    );
    this.name = new.target.name;
    if (init.callId !== undefined) this.callId = init.callId;
    if (init.provider !== undefined) this.provider = init.provider;
    if (init.model !== undefined) this.model = init.model;
    if (init.attempts !== undefined) this.attempts = init.attempts;
  }
}

export class AuthError extends LLMRuntimeError {
  public override readonly kind = 'auth' as const;
}

export class InvalidRequestError extends LLMRuntimeError {
  public override readonly kind = 'invalid_request' as const;
}

export interface RateLimitErrorInit extends LLMRuntimeErrorInit {
  readonly retryAfterMs?: number;
}

export class RateLimitError extends LLMRuntimeError {
  public override readonly kind = 'rate_limit' as const;
  public readonly retryAfterMs?: number;

  constructor(init: RateLimitErrorInit = {}) {
    super(init);
    if (init.retryAfterMs !== undefined) this.retryAfterMs = init.retryAfterMs;
  }
}

export class OverloadedError extends LLMRuntimeError {
  public override readonly kind = 'overloaded' as const;
}

export class TransientProviderError extends LLMRuntimeError {
  public override readonly kind = 'transient_provider' as const;
}

export class ProviderProtocolError extends LLMRuntimeError {
  public override readonly kind = 'provider_protocol' as const;
}

export class ResponseParseError extends LLMRuntimeError {
  public override readonly kind = 'response_parse' as const;
}

export interface TimeoutErrorInit extends LLMRuntimeErrorInit {
  readonly timeoutMs?: number;
}

export class TimeoutError extends LLMRuntimeError {
  public override readonly kind = 'timeout' as const;
  public readonly timeoutMs?: number;

  constructor(init: TimeoutErrorInit = {}) {
    super(init);
    if (init.timeoutMs !== undefined) this.timeoutMs = init.timeoutMs;
  }
}

export class AbortedError extends LLMRuntimeError {
  public override readonly kind = 'aborted' as const;
}

export class SilentTruncationError extends LLMRuntimeError {
  public override readonly kind = 'silent_truncation' as const;
}

export class ContentFilterError extends LLMRuntimeError {
  public override readonly kind = 'content_filter' as const;
}
