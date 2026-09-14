// NIB-T §18.9 — per-attempt timeout covers the response body.
//
// Regression guard for transports that answer headers and then stall the body:
// the attempt timeout must bound the whole response lifecycle, so a stalled
// body can never hold the call open past `timeout.perAttemptMs`.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { AbortedError, TimeoutError } from '../../src/errors/index.js';
import { createOpenAICompatibleAdapter } from '../../src/factories/openai-compatible.js';
import {
  createCountingBodyFetch,
  createStallingBodyFetch,
} from '../helpers/stalling-body-fetch.js';

const CHAT_BODY = {
  id: 'chatcmpl-body-timeout',
  model: 'deepseek-flash',
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content: 'OK' },
      finish_reason: 'stop',
    },
  ],
  usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
};

function createAdapter(timeoutPerAttemptMs: number) {
  return createOpenAICompatibleAdapter({
    provider: 'deepseek',
    model: 'deepseek-flash',
    apiKey: 'test-key',
    sanitization: {},
    retry: { maxAttempts: 1, backoffBaseMs: 0, maxBackoffMs: 0 },
    timeout: { perAttemptMs: timeoutPerAttemptMs },
  });
}

const REQUEST = { messages: [{ role: 'user' as const, content: 'plan commits' }] };

async function captureFailure(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return undefined;
  } catch (error: unknown) {
    return error;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('§18.9 executeCall — timeout covers the response body', () => {
  it('T-EC-160 | stalled body on a 2xx response fails with TimeoutError bounded by perAttemptMs', async () => {
    vi.stubGlobal('fetch', createStallingBodyFetch({ status: 200 }));
    const adapter = createAdapter(60);
    const startedAt = Date.now();

    const error = await captureFailure(adapter.call(REQUEST));
    const elapsed = Date.now() - startedAt;

    expect(error).toBeInstanceOf(TimeoutError);
    expect((error as TimeoutError).timeoutMs).toBe(60);
    expect(elapsed).toBeLessThan(1500);
  });

  it('T-EC-161 | stalled body on a non-2xx response also fails with TimeoutError', async () => {
    vi.stubGlobal('fetch', createStallingBodyFetch({ status: 500 }));
    const adapter = createAdapter(60);
    const startedAt = Date.now();

    const error = await captureFailure(adapter.call(REQUEST));
    const elapsed = Date.now() - startedAt;

    expect(error).toBeInstanceOf(TimeoutError);
    expect(elapsed).toBeLessThan(1500);
  });

  it('T-EC-162 | external abort during a stalled body produces AbortedError, not TimeoutError', async () => {
    vi.stubGlobal('fetch', createStallingBodyFetch({ status: 200 }));
    const adapter = createAdapter(5000);
    const controller = new AbortController();
    const startedAt = Date.now();
    const pending = adapter.call(REQUEST, { signal: controller.signal });
    setTimeout(() => controller.abort(), 30);

    const error = await captureFailure(pending);
    const elapsed = Date.now() - startedAt;

    expect(error).toBeInstanceOf(AbortedError);
    expect(elapsed).toBeLessThan(1500);
  });

  it('T-EC-163 | a completed body is materialized exactly once per attempt', async () => {
    const counting = createCountingBodyFetch(CHAT_BODY);
    vi.stubGlobal('fetch', counting.fetch);
    const adapter = createAdapter(1000);

    const response = await adapter.call(REQUEST);

    expect(response.content).toBe('OK');
    expect(counting.bodyReads()).toBe(1);
  });

  it('T-EC-164 | the ordinary success path remains unaffected', async () => {
    const counting = createCountingBodyFetch(CHAT_BODY);
    vi.stubGlobal('fetch', counting.fetch);
    const adapter = createAdapter(1000);

    const response = await adapter.call(REQUEST);

    expect(response.termination).toBe('completed');
    expect(response.usage.inputTokens).toBe(5);
  });
});
