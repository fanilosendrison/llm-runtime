// NIB-M-BINDINGS-COMPLETION §4 — OpenAI Chat Completions binding.

import {
  AuthError,
  ContentFilterError,
  InvalidRequestError,
  type LLMRuntimeError,
  RateLimitError,
  ResponseParseError,
  TransientProviderError,
} from '../errors/index.js';
import type { ProviderErrorSignal } from '../services/error-classifier-base.js';
import { parseRetryAfter } from '../services/retry-resolver.js';
import type { RateLimitSnapshot } from '../services/throttle-resolver.js';
import type { LLMRequest, LLMUsage, TerminationReason } from '../types.js';
import type { CanonicalHttpRequest, ParsedProviderResponse, ProviderBinding } from './types.js';

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

const TERMINATION_MAP: Readonly<Record<string, TerminationReason>> = Object.freeze({
  stop: 'completed',
  length: 'max_tokens',
  content_filter: 'content_filter',
  tool_calls: 'completed',
  function_call: 'completed',
});

function buildOpenAILikeRequest(
  url: string,
  request: LLMRequest,
  config: { model: string; apiKey: string },
): CanonicalHttpRequest {
  const body: Record<string, unknown> = {
    model: config.model,
    messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (request.maxTokens !== undefined) body['max_tokens'] = request.maxTokens;
  if (request.temperature !== undefined) body['temperature'] = request.temperature;
  if (request.stopSequences !== undefined) body['stop'] = [...request.stopSequences];

  return {
    method: 'POST',
    url,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
    },
    bodyKind: 'json',
    bodyJson: body,
  };
}

function parseOpenAILikeResponse(body: unknown): ParsedProviderResponse {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (cause) {
      throw new ResponseParseError({ message: 'openai: body is not valid JSON', cause });
    }
  }
  if (body === null || typeof body !== 'object') {
    throw new ResponseParseError({ message: 'openai: body is not an object' });
  }
  const obj = body as Record<string, unknown>;
  const choices = obj['choices'];
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new ResponseParseError({ message: 'openai: missing or empty choices[]' });
  }
  const choice = choices[0] as Record<string, unknown>;
  const message = choice['message'] as Record<string, unknown> | undefined;
  const content = message?.['content'];
  const rawContent = typeof content === 'string' ? content : '';
  const finishReason = choice['finish_reason'];
  if (typeof finishReason !== 'string') {
    throw new ResponseParseError({ message: 'openai: missing finish_reason' });
  }

  const usage: LLMUsage = {};
  const rawUsage = obj['usage'];
  if (rawUsage !== null && typeof rawUsage === 'object') {
    const u = rawUsage as Record<string, unknown>;
    const input = typeof u['prompt_tokens'] === 'number' ? u['prompt_tokens'] : undefined;
    const output = typeof u['completion_tokens'] === 'number' ? u['completion_tokens'] : undefined;
    const total = typeof u['total_tokens'] === 'number' ? u['total_tokens'] : undefined;
    if (input !== undefined) (usage as { inputTokens?: number }).inputTokens = input;
    if (output !== undefined) (usage as { outputTokens?: number }).outputTokens = output;
    if (total !== undefined) (usage as { totalTokens?: number }).totalTokens = total;
  }

  return {
    rawContent,
    terminationSignal: finishReason,
    usage,
    ...(typeof obj['id'] === 'string' ? { providerResponseId: obj['id'] } : {}),
    ...(typeof obj['model'] === 'string' ? { providerModel: obj['model'] } : {}),
  };
}

function classifyOpenAILikeError(
  signal: ProviderErrorSignal,
  labelPrefix: string,
): LLMRuntimeError {
  const bodyText = signal.bodyText ?? '';
  if (signal.status === 400 && /content[_-]policy[_-]violation|content[_-]filter/i.test(bodyText)) {
    return new ContentFilterError({ message: `${labelPrefix}: content policy violation` });
  }
  if (signal.status === 429) {
    const retryAfterMs = parseRetryAfter(signal.headers);
    return new RateLimitError({
      message: `${labelPrefix} 429: ${bodyText || 'rate limited'}`,
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    });
  }
  if (signal.status === 401 || signal.status === 403) {
    return new AuthError({
      message: `${labelPrefix} ${signal.status}: ${bodyText || 'unauthorized'}`,
    });
  }
  if (signal.status === 400 || signal.status === 404) {
    return new InvalidRequestError({
      message: `${labelPrefix} ${signal.status}: ${bodyText || 'invalid'}`,
    });
  }
  return new TransientProviderError({
    message: `${labelPrefix} ${signal.status ?? 'unknown'}: ${bodyText || 'transient'}`,
    ...(signal.status !== undefined ? { status: signal.status } : {}),
  });
}

function parseOpenAIResetDuration(value: string): number | undefined {
  const durationRe = /(\d+)(ms|s|m|h)/g;
  const matches = [...value.matchAll(durationRe)];
  if (matches.length === 0) return undefined;
  let totalMs = 0;
  for (const match of matches) {
    const num = Number.parseInt(match[1] ?? '', 10);
    if (Number.isNaN(num)) continue;
    const unit = match[2] ?? '';
    if (unit === 'ms') totalMs += num;
    else if (unit === 's') totalMs += num * 1000;
    else if (unit === 'm') totalMs += num * 60_000;
    else if (unit === 'h') totalMs += num * 3_600_000;
  }
  return totalMs;
}

function parseIntStr(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

function readOpenAIRateLimitHeaders(
  headers: Record<string, string>,
  nowMono: number,
): RateLimitSnapshot | null {
  const remaining = parseIntStr(headers['x-ratelimit-remaining-tokens']);
  const resetStr = headers['x-ratelimit-reset-tokens'];
  if (remaining === undefined || resetStr === undefined) return null;
  const resetMs = parseOpenAIResetDuration(resetStr);
  if (resetMs === undefined) return null;
  return {
    remainingTokens: remaining,
    resetTokensAt: nowMono + resetMs,
    lastCallOutputTokens: 0,
    state: 'known',
  };
}

export const openaiBinding: ProviderBinding = {
  buildRequest: (request, config) =>
    buildOpenAILikeRequest(config.endpoint ?? DEFAULT_ENDPOINT, request, config),
  parseResponse: (body) => parseOpenAILikeResponse(body),
  classifyError: (signal) => classifyOpenAILikeError(signal, 'openai'),
  readRateLimitHeaders: (headers, nowMono) => readOpenAIRateLimitHeaders(headers, nowMono),
  terminationMap: TERMINATION_MAP,
  quirks: {
    hasRateLimitHeaders: true,
    mayRouteModel: false,
    defaultSanitization: {
      stripThinkingTags: true,
      stripJsonFence: false,
    },
  },
};

// Re-exported for the openai-compatible binding (which reuses the helpers).
export {
  buildOpenAILikeRequest,
  classifyOpenAILikeError,
  parseIntStr,
  parseOpenAILikeResponse,
  parseOpenAIResetDuration,
  TERMINATION_MAP as OPENAI_TERMINATION_MAP,
};
