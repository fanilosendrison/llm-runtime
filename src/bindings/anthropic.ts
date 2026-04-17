// NIB-M-BINDINGS-COMPLETION §3 — Anthropic Messages API binding.

import {
  AuthError,
  InvalidRequestError,
  type LLMRuntimeError,
  OverloadedError,
  RateLimitError,
  ResponseParseError,
  TransientProviderError,
} from '../errors/index.js';
import type { ProviderErrorSignal } from '../services/error-classifier-base.js';
import { parseRetryAfter } from '../services/retry-resolver.js';
import type { RateLimitSnapshot } from '../services/throttle-resolver.js';
import type { LLMRequest, LLMUsage, TerminationReason } from '../types.js';
import type { CanonicalHttpRequest, ParsedProviderResponse, ProviderBinding } from './types.js';

const DEFAULT_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

interface AnthropicProviderOptions {
  readonly extendedThinking?: {
    readonly enabled?: boolean;
    readonly budgetTokens?: number;
  };
}

const TERMINATION_MAP: Readonly<Record<string, TerminationReason>> = Object.freeze({
  end_turn: 'completed',
  max_tokens: 'max_tokens',
  stop_sequence: 'stop_sequence',
  tool_use: 'completed',
});

function buildRequest(
  request: LLMRequest,
  config: {
    model: string;
    apiKey: string;
    endpoint?: string;
    providerOptions?: Record<string, unknown>;
  },
): CanonicalHttpRequest {
  const systemParts: string[] = [];
  const chatMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const msg of request.messages) {
    if (msg.role === 'system') systemParts.push(msg.content);
    else chatMessages.push({ role: msg.role, content: msg.content });
  }

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: request.maxTokens ?? 1024,
    messages: chatMessages,
  };
  if (systemParts.length > 0) body['system'] = systemParts.join('\n\n');
  if (request.temperature !== undefined) body['temperature'] = request.temperature;
  if (request.stopSequences !== undefined) body['stop_sequences'] = [...request.stopSequences];

  const opts = config.providerOptions as AnthropicProviderOptions | undefined;
  if (opts?.extendedThinking?.enabled === true) {
    body['thinking'] = {
      type: 'enabled',
      budget_tokens: opts.extendedThinking.budgetTokens ?? 0,
    };
  }

  return {
    method: 'POST',
    url: config.endpoint ?? DEFAULT_ENDPOINT,
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    bodyKind: 'json',
    bodyJson: body,
  };
}

function parseResponse(body: unknown, _headers: Record<string, string>): ParsedProviderResponse {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (cause) {
      throw new ResponseParseError({
        message: 'anthropic: body is not valid JSON',
        cause,
      });
    }
  }
  if (body === null || typeof body !== 'object') {
    throw new ResponseParseError({ message: 'anthropic: body is not an object' });
  }
  const obj = body as Record<string, unknown>;
  if (!Array.isArray(obj['content'])) {
    throw new ResponseParseError({ message: 'anthropic: missing content[]' });
  }
  if (typeof obj['stop_reason'] !== 'string') {
    throw new ResponseParseError({ message: 'anthropic: missing stop_reason' });
  }

  const textParts: string[] = [];
  for (const block of obj['content'] as unknown[]) {
    if (block === null || typeof block !== 'object') {
      throw new ResponseParseError({ message: 'anthropic: invalid content block' });
    }
    const b = block as Record<string, unknown>;
    if (b['type'] === 'text') {
      if (typeof b['text'] !== 'string') {
        throw new ResponseParseError({ message: 'anthropic: text block missing text field' });
      }
      textParts.push(b['text']);
    }
    // thinking and tool_use blocks are ignored in rawContent.
  }

  const usage: LLMUsage = {};
  const rawUsage = obj['usage'];
  if (rawUsage !== null && typeof rawUsage === 'object') {
    const u = rawUsage as Record<string, unknown>;
    const input = typeof u['input_tokens'] === 'number' ? u['input_tokens'] : undefined;
    const output = typeof u['output_tokens'] === 'number' ? u['output_tokens'] : undefined;
    if (input !== undefined) (usage as { inputTokens?: number }).inputTokens = input;
    if (output !== undefined) (usage as { outputTokens?: number }).outputTokens = output;
    if (input !== undefined && output !== undefined) {
      (usage as { totalTokens?: number }).totalTokens = input + output;
    }
  }

  const out: ParsedProviderResponse = {
    rawContent: textParts.join(''),
    terminationSignal: obj['stop_reason'],
    usage,
    ...(typeof obj['id'] === 'string' ? { providerResponseId: obj['id'] } : {}),
    ...(typeof obj['model'] === 'string' ? { providerModel: obj['model'] } : {}),
  };
  return out;
}

function classifyError(signal: ProviderErrorSignal): LLMRuntimeError {
  const message = (signal.bodyText ?? '').length > 0 ? (signal.bodyText ?? '') : 'anthropic error';
  if (signal.status === 529) {
    const retryAfterMs = parseRetryAfter(signal.headers);
    return new OverloadedError({
      message: `anthropic 529: ${message}`,
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    });
  }
  if (signal.status === 429) {
    const retryAfterMs = parseRetryAfter(signal.headers);
    return new RateLimitError({
      message: `anthropic 429: ${message}`,
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    });
  }
  if (signal.status === 401 || signal.status === 403) {
    return new AuthError({ message: `anthropic ${signal.status}: ${message}` });
  }
  if (signal.status === 400 || signal.status === 404) {
    return new InvalidRequestError({ message: `anthropic ${signal.status}: ${message}` });
  }
  return new TransientProviderError({
    message: `anthropic ${signal.status ?? 'unknown'}: ${message}`,
    ...(signal.status !== undefined ? { status: signal.status } : {}),
  });
}

function parseIsoDate(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

function parseIntHeader(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

function readRateLimitHeaders(
  headers: Record<string, string>,
  nowMono: number,
  nowWall: Date,
): RateLimitSnapshot | null {
  const remaining = parseIntHeader(headers['anthropic-ratelimit-input-tokens-remaining']);
  const resetWallMs = parseIsoDate(headers['anthropic-ratelimit-input-tokens-reset']);
  if (remaining === undefined || resetWallMs === undefined) return null;
  const deltaMs = resetWallMs - nowWall.getTime();
  const resetMono = nowMono + Math.max(deltaMs, 0);
  return {
    remainingTokens: remaining,
    resetTokensAt: resetMono,
    lastCallOutputTokens: 0,
    state: 'known',
  };
}

export const anthropicBinding: ProviderBinding = {
  buildRequest,
  parseResponse,
  classifyError,
  readRateLimitHeaders,
  terminationMap: TERMINATION_MAP,
  quirks: {
    hasRateLimitHeaders: true,
    mayRouteModel: true,
    defaultSanitization: {
      stripThinkingTags: true,
      stripJsonFence: true,
    },
  },
};
