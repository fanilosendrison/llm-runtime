// NIB-M-INFRA-UTILS — default logger (stderr JSON-line). Stub only.

import type { LLMEvent, LLMLogger } from '../types.js';

export const defaultStderrLogger: LLMLogger = {
  emit(_event: LLMEvent): void {
    throw new Error('Not implemented');
  },
};
