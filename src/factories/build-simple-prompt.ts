// NIB-M-FACTORIES §5.4 — ergonomic helper. No semantic decision.

import type { LLMMessage } from '../types.js';

export function buildSimplePrompt(
  systemPrompt: string | undefined,
  userPrompt: string,
): readonly LLMMessage[] {
  const messages: LLMMessage[] = [];
  if (systemPrompt !== undefined && systemPrompt.length > 0) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });
  return messages;
}
