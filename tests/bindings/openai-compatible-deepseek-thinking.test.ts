// NIB-T §12.7 — DeepSeek thinking provider option (provider isolation).
//
// DeepSeek is the only OpenAI-compatible provider in the v1 set that exposes a
// thinking-mode switch through the Chat Completions body. Every other
// compatible provider must ignore the option entirely.

import { describe, expect, it } from 'vitest';

import { createOpenAICompatibleBinding } from '../../src/bindings/openai-compatible.js';
import type { BindingConfig } from '../../src/bindings/types.js';
import { InvalidRequestError } from '../../src/errors/index.js';
import { createOpenAICompatibleAdapter } from '../../src/factories/openai-compatible.js';
import { deepFreeze } from '../helpers/deep-freeze.js';

function cfg(overrides: Partial<BindingConfig> = {}): BindingConfig {
  return {
    model: 'deepseek-flash',
    apiKey: 'x',
    ...overrides,
  };
}

function bodyOf(http: { bodyJson: Record<string, unknown> }): Record<string, unknown> {
  return http.bodyJson;
}

describe('§12.7 DeepSeek thinking provider option', () => {
  it('T-OC-30 | disabled option serializes an explicit disabled thinking block', () => {
    const binding = createOpenAICompatibleBinding('deepseek');
    const http = binding.buildRequest(
      { messages: [{ role: 'user', content: 'hi' }] },
      cfg({ providerOptions: { thinking: { type: 'disabled' } } }),
    );
    const body = bodyOf(http);
    expect(body['thinking']).toEqual({ type: 'disabled' });
    expect(body['reasoning_effort']).toBeUndefined();
  });

  it('T-OC-31 | enabled option with effort serializes thinking and reasoning_effort', () => {
    const binding = createOpenAICompatibleBinding('deepseek');
    const http = binding.buildRequest(
      { messages: [{ role: 'user', content: 'hi' }] },
      cfg({ providerOptions: { thinking: { type: 'enabled', reasoningEffort: 'high' } } }),
    );
    const body = bodyOf(http);
    expect(body['thinking']).toEqual({ type: 'enabled' });
    expect(body['reasoning_effort']).toBe('high');
  });

  it('T-OC-32 | enabled option without effort omits reasoning_effort', () => {
    const binding = createOpenAICompatibleBinding('deepseek');
    const http = binding.buildRequest(
      { messages: [{ role: 'user', content: 'hi' }] },
      cfg({ providerOptions: { thinking: { type: 'enabled' } } }),
    );
    const body = bodyOf(http);
    expect(body['thinking']).toEqual({ type: 'enabled' });
    expect(body['reasoning_effort']).toBeUndefined();
  });

  it('T-OC-33 | provider option takes precedence over the legacy request flag', () => {
    const binding = createOpenAICompatibleBinding('deepseek');
    const http = binding.buildRequest(
      {
        messages: [{ role: 'user', content: 'hi' }],
        thinking: true,
        reasoningEffort: 'high',
      },
      cfg({ providerOptions: { thinking: { type: 'disabled' } } }),
    );
    const body = bodyOf(http);
    expect(body['thinking']).toEqual({ type: 'disabled' });
    expect(body['reasoning_effort']).toBeUndefined();
  });

  it('T-OC-34 | unrelated provider options are ignored without throwing', () => {
    const binding = createOpenAICompatibleBinding('deepseek');
    const http = binding.buildRequest(
      { messages: [{ role: 'user', content: 'hi' }] },
      cfg({ providerOptions: { fetch: () => undefined, unrelated: true } }),
    );
    expect(bodyOf(http)['thinking']).toBeUndefined();
  });

  it('T-OC-35 | buildRequest is pure with provider options (frozen inputs)', () => {
    const binding = createOpenAICompatibleBinding('deepseek');
    const request = deepFreeze({
      messages: [{ role: 'user' as const, content: 'hi' }],
    });
    const config = deepFreeze({
      ...cfg({ providerOptions: { thinking: { type: 'disabled' as const } } }),
    });
    expect(() => binding.buildRequest(request, config)).not.toThrow();
  });

  it('T-OC-36 | non-DeepSeek compatible providers ignore the thinking option', () => {
    const providers = ['mistral', 'groq', 'together', 'ollama'] as const;
    for (const provider of providers) {
      const binding = createOpenAICompatibleBinding(provider);
      const http = binding.buildRequest(
        { messages: [{ role: 'user', content: 'hi' }] },
        cfg({ providerOptions: { thinking: { type: 'enabled', reasoningEffort: 'max' } } }),
      );
      const body = bodyOf(http);
      expect(body['thinking'], `${provider} must not receive a thinking block`).toBeUndefined();
      expect(body['reasoning_effort'], `${provider} must not receive an effort`).toBeUndefined();
    }
  });
});

describe('§12.7 DeepSeek provider option validation (fail-closed at construction)', () => {
  function adapterConfig(providerOptions: unknown) {
    return {
      provider: 'deepseek' as const,
      model: 'deepseek-flash',
      apiKey: 'x',
      sanitization: {},
      providerOptions,
    };
  }

  it('T-OC-37 | rejects an unknown thinking type', () => {
    expect(() =>
      createOpenAICompatibleAdapter(adapterConfig({ thinking: { type: 'off' } })),
    ).toThrow(InvalidRequestError);
  });

  it('T-OC-38 | rejects a non-object thinking option', () => {
    expect(() => createOpenAICompatibleAdapter(adapterConfig({ thinking: 'disabled' }))).toThrow(
      InvalidRequestError,
    );
  });

  it('T-OC-39 | rejects an unsupported reasoning effort', () => {
    expect(() =>
      createOpenAICompatibleAdapter(
        adapterConfig({ thinking: { type: 'enabled', reasoningEffort: 'ultra' } }),
      ),
    ).toThrow(InvalidRequestError);
  });

  it('T-OC-40 | rejects reasoning effort combined with disabled thinking', () => {
    expect(() =>
      createOpenAICompatibleAdapter(
        adapterConfig({ thinking: { type: 'disabled', reasoningEffort: 'high' } }),
      ),
    ).toThrow(InvalidRequestError);
  });

  it('T-OC-41 | accepts valid thinking options and unrelated keys', () => {
    expect(() =>
      createOpenAICompatibleAdapter(adapterConfig({ thinking: { type: 'disabled' } })),
    ).not.toThrow();
    expect(() =>
      createOpenAICompatibleAdapter(adapterConfig({ fetch: () => undefined })),
    ).not.toThrow();
  });

  it('T-OC-42 | non-DeepSeek providers are unaffected by the DeepSeek validator', () => {
    expect(() =>
      createOpenAICompatibleAdapter({
        provider: 'mistral',
        model: 'mistral-large',
        apiKey: 'x',
        sanitization: {},
        providerOptions: { thinking: { type: 'off' } },
      }),
    ).not.toThrow();
  });
});
