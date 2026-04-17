// NIB-M-FACTORIES — createOpenAICompatibleAdapter. Stub only.

import type { OpenAICompatibleProvider } from '../bindings/types.js';
import type { AdapterConfig, ProviderAdapter } from '../types.js';

export interface OpenAICompatibleAdapterConfig extends AdapterConfig {
  readonly provider: OpenAICompatibleProvider;
}

export function createOpenAICompatibleAdapter(
  _config: OpenAICompatibleAdapterConfig,
): ProviderAdapter {
  throw new Error('Not implemented');
}
