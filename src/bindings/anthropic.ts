// NIB-M-BINDINGS-COMPLETION — Anthropic binding. Stub only.

import type { ProviderBinding } from './types.js';

const notImplemented = (): never => {
  throw new Error('Not implemented');
};

export const anthropicBinding: ProviderBinding = {
  buildRequest: notImplemented,
  parseResponse: notImplemented,
  classifyError: notImplemented,
  readRateLimitHeaders: notImplemented,
  terminationMap: Object.freeze({}) as Readonly<Record<string, never>>,
  quirks: {
    hasRateLimitHeaders: true,
    mayRouteModel: true,
    defaultSanitization: {
      stripThinkingTags: true,
      stripJsonFence: true,
    },
  },
};
