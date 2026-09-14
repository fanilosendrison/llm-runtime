// DeepSeek-specific provider options (NIB-M-BINDINGS-COMPLETION §5.2,
// NIB-S-LLMRUNTIME I-9).
//
// DeepSeek exposes an explicit thinking-mode switch on Chat Completions and
// defaults it to `enabled` with high effort when the field is absent. A caller
// that needs non-thinking behavior must therefore send an explicit `disabled`
// value. The option travels through the factory `providerOptions` channel and
// is interpreted only by the DeepSeek binding.

import { InvalidRequestError } from '../errors/index.js';

export type DeepSeekReasoningEffort = 'low' | 'high' | 'max';

export interface DeepSeekThinkingOption {
  readonly type: 'enabled' | 'disabled';
  readonly reasoningEffort?: DeepSeekReasoningEffort;
}

const ALLOWED_THINKING_TYPES: ReadonlySet<string> = new Set(['enabled', 'disabled']);
const ALLOWED_REASONING_EFFORTS: ReadonlySet<string> = new Set(['low', 'high', 'max']);

type ParsedProviderOptions =
  | { readonly kind: 'absent' }
  | { readonly kind: 'valid'; readonly option: DeepSeekThinkingOption }
  | { readonly kind: 'invalid'; readonly reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseProviderOptions(providerOptions: unknown): ParsedProviderOptions {
  if (providerOptions === undefined || providerOptions === null) return { kind: 'absent' };
  if (!isRecord(providerOptions)) {
    return { kind: 'invalid', reason: 'providerOptions must be an object when present' };
  }
  const rawThinking = providerOptions['thinking'];
  if (rawThinking === undefined) return { kind: 'absent' };
  if (!isRecord(rawThinking)) {
    return { kind: 'invalid', reason: 'thinking must be an object' };
  }

  const type = rawThinking['type'];
  if (typeof type !== 'string' || !ALLOWED_THINKING_TYPES.has(type)) {
    return {
      kind: 'invalid',
      reason: `thinking.type must be one of: enabled, disabled (received ${String(type)})`,
    };
  }

  const rawEffort = rawThinking['reasoningEffort'];
  if (rawEffort === undefined) {
    return { kind: 'valid', option: { type } as DeepSeekThinkingOption };
  }
  if (typeof rawEffort !== 'string' || !ALLOWED_REASONING_EFFORTS.has(rawEffort)) {
    return {
      kind: 'invalid',
      reason: `thinking.reasoningEffort must be one of: low, high, max (received ${String(rawEffort)})`,
    };
  }
  if (type !== 'enabled') {
    return {
      kind: 'invalid',
      reason: 'thinking.reasoningEffort requires thinking.type enabled',
    };
  }
  return {
    kind: 'valid',
    option: { type: 'enabled', reasoningEffort: rawEffort as DeepSeekReasoningEffort },
  };
}

/**
 * Lenient read used by the binding. Returns the validated option, or
 * `undefined` when the option is absent or malformed. The binding never throws
 * from `buildRequest`; strict rejection belongs to the factory.
 */
export function readDeepSeekThinkingOption(
  providerOptions: unknown,
): DeepSeekThinkingOption | undefined {
  const parsed = parseProviderOptions(providerOptions);
  return parsed.kind === 'valid' ? parsed.option : undefined;
}

/**
 * Fail-closed validation used by the factory (I-4). Rejects a malformed
 * DeepSeek thinking option before any resource is allocated.
 */
export function assertDeepSeekProviderOptions(providerOptions: unknown): void {
  const parsed = parseProviderOptions(providerOptions);
  if (parsed.kind === 'invalid') {
    throw new InvalidRequestError({ message: `DeepSeek providerOptions: ${parsed.reason}` });
  }
}

/**
 * Returns a new request body carrying the resolved DeepSeek thinking mode.
 * Disabling thinking also clears `reasoning_effort`, which is only meaningful
 * in thinking mode.
 */
export function withDeepSeekThinking(
  body: Record<string, unknown>,
  option: DeepSeekThinkingOption,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...body, thinking: { type: option.type } };
  if (option.type === 'enabled' && option.reasoningEffort !== undefined) {
    next['reasoning_effort'] = option.reasoningEffort;
  } else {
    delete next['reasoning_effort'];
  }
  return next;
}
