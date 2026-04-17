// NIB-M-BINDINGS-COMPLETION — OpenAI-compatible factory (parameterized by provider). Stub only.

import type { OpenAICompatibleProvider, ProviderBinding, ProviderQuirks } from './types.js';

const notImplemented = (): never => {
  throw new Error('Not implemented');
};

export function createOpenAICompatibleBinding(_provider: OpenAICompatibleProvider): ProviderBinding {
  const quirks: ProviderQuirks = {
    hasRateLimitHeaders: false,
    mayRouteModel: false,
    defaultSanitization: {
      stripThinkingTags: true,
      stripJsonFence: false,
    },
  };
  return {
    buildRequest: notImplemented,
    parseResponse: notImplemented,
    classifyError: notImplemented,
    readRateLimitHeaders: notImplemented,
    terminationMap: Object.freeze({}) as Readonly<Record<string, never>>,
    quirks,
  };
}
