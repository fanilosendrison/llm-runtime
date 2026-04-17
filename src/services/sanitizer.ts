// NIB-M-SANITIZER — stubs only. stripJsonFence delegates to ai-json-safe-parse (DC-AI-JSON-SAFE-PARSE).

export interface StripResult {
  readonly content: string;
  readonly removed: boolean;
}

export function stripThinkingTags(_content: string): StripResult {
  throw new Error('Not implemented');
}

export function stripJsonFence(_content: string): StripResult {
  throw new Error('Not implemented');
}

export function detectHeuristicTruncation(
  _content: string,
  _maxTokens: number | undefined,
): boolean {
  throw new Error('Not implemented');
}
