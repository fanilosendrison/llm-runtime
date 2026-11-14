import { ResponseParseError } from '../../errors/index.js';
import type { ParsedProviderResponse } from '../types.js';
import { parseOpenAILikeResponse } from './openai-common.js';

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Never quote provider payloads, segment text, signatures or reasoning in errors. */
function refuse(): never {
  throw new ResponseParseError({
    message: 'mistral: malformed or unsupported completion response',
  });
}

function keysWithin(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function textChunk(value: Record<string, unknown>): boolean {
  return (
    value['type'] === 'text' &&
    typeof value['text'] === 'string' &&
    keysWithin(value, ['type', 'text'])
  );
}

/** Validate supported reasoning wire shapes only; never extract their text. */
function thinkingItem(value: unknown): boolean {
  if (!record(value)) return false;
  if (textChunk(value)) return true;
  if (value['type'] === 'reference') {
    const ids = value['reference_ids'];
    return (
      keysWithin(value, ['type', 'reference_ids']) &&
      Array.isArray(ids) &&
      ids.every((id) => typeof id === 'string' || Number.isSafeInteger(id))
    );
  }
  if (value['type'] !== 'tool_reference') return false;
  return (
    keysWithin(value, ['type', 'tool', 'title', 'url', 'favicon', 'description']) &&
    typeof value['tool'] === 'string' &&
    typeof value['title'] === 'string' &&
    ['url', 'favicon', 'description'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string',
    )
  );
}

function thinkingChunk(value: Record<string, unknown>): boolean {
  const items = value['thinking'];
  return (
    value['type'] === 'thinking' &&
    keysWithin(value, ['type', 'thinking', 'signature', 'closed']) &&
    Array.isArray(items) &&
    items.every(thinkingItem) &&
    (value['signature'] === undefined ||
      value['signature'] === null ||
      typeof value['signature'] === 'string') &&
    (value['closed'] === undefined || typeof value['closed'] === 'boolean')
  );
}

function finalText(content: unknown): string {
  // Preserve the historical string contract, including empty strings.
  if (typeof content === 'string') return content;
  if (!Array.isArray(content) || content.length === 0) return refuse();
  const texts: string[] = [];
  for (const chunk of content) {
    if (!record(chunk)) return refuse();
    if (textChunk(chunk)) texts.push(chunk['text'] as string);
    else if (!thinkingChunk(chunk)) return refuse();
  }
  const text = texts.join('');
  if (text.length === 0) return refuse();
  return text;
}

/** Mistral wire decoding only; engine sanitization, limits and retry remain unchanged. */
export function parseMistralResponse(body: unknown): ParsedProviderResponse {
  if (!record(body)) return refuse();
  const choices = body['choices'];
  if (!Array.isArray(choices) || !record(choices[0])) return refuse();
  const choice = choices[0];
  const message = choice['message'];
  if (!record(message) || typeof choice['finish_reason'] !== 'string') return refuse();
  for (const key of ['id', 'model']) {
    if (body[key] !== undefined && typeof body[key] !== 'string') return refuse();
  }
  const usage = body['usage'];
  if (usage !== undefined && usage !== null) {
    if (!record(usage)) return refuse();
    for (const key of ['prompt_tokens', 'completion_tokens', 'total_tokens']) {
      const count = usage[key];
      if (count !== undefined && (!Number.isSafeInteger(count) || (count as number) < 0))
        return refuse();
    }
  }
  const rawContent = finalText(message['content']);
  // Reuse the canonical metadata mapping without changing other providers' decoder.
  return { ...parseOpenAILikeResponse(body), rawContent };
}
