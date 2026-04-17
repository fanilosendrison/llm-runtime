// NIB-M-BINDINGS-COMPLETION — OpenAI binding. Stub only.

import type { ProviderBinding } from './types.js';

const notImplemented = (): never => {
  throw new Error('Not implemented');
};

export const openaiBinding: ProviderBinding = {
  buildRequest: notImplemented,
  parseResponse: notImplemented,
  classifyError: notImplemented,
  readRateLimitHeaders: notImplemented,
  terminationMap: Object.freeze({}) as Readonly<Record<string, never>>,
  quirks: {
    hasRateLimitHeaders: true,
    mayRouteModel: false,
    defaultSanitization: {
      stripThinkingTags: true,
      stripJsonFence: false,
    },
  },
};
