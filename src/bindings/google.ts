// NIB-M-BINDINGS-COMPLETION — Google Gemini binding. Stub only.

import type { ProviderBinding } from './types.js';

const notImplemented = (): never => {
  throw new Error('Not implemented');
};

export const googleBinding: ProviderBinding = {
  buildRequest: notImplemented,
  parseResponse: notImplemented,
  classifyError: notImplemented,
  readRateLimitHeaders: notImplemented,
  terminationMap: Object.freeze({}) as Readonly<Record<string, never>>,
  quirks: {
    hasRateLimitHeaders: false,
    mayRouteModel: false,
    defaultSanitization: {
      stripThinkingTags: true,
      stripJsonFence: true,
    },
  },
};
