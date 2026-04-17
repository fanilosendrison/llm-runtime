// NIB-M-BINDING-EMBEDDING — OpenAI Embeddings binding. Stub only.

import type { EmbeddingBinding } from './types.js';

const notImplemented = (): never => {
  throw new Error('Not implemented');
};

export const openaiEmbeddingsBinding: EmbeddingBinding = {
  buildRequest: notImplemented,
  parseEmbeddings: notImplemented,
  classifyError: notImplemented,
  readRateLimitHeaders: notImplemented,
  quirks: {
    hasRateLimitHeaders: true,
  },
};
