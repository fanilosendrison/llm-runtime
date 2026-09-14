// NIB-T §20.10 — per-attempt timeout covers the embedding response body.
//
// The embedding engine must inherit the same aggregate timeout guarantee as
// completion: a transport that stalls the body is bounded by
// `timeout.perAttemptMs`, not only by the header phase.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TimeoutError } from '../../src/errors/index.js';
import { createOpenAIEmbeddingAdapter } from '../../src/factories/openai-embeddings.js';
import {
  createCountingBodyFetch,
  createStallingBodyFetch,
} from '../helpers/stalling-body-fetch.js';

const EMBEDDING_BODY = {
  object: 'list',
  data: [
    { object: 'embedding', index: 0, embedding: [0.1, 0.2, 0.3] },
    { object: 'embedding', index: 1, embedding: [0.4, 0.5, 0.6] },
  ],
  model: 'text-embedding-3-small',
  usage: { prompt_tokens: 4, total_tokens: 4 },
};

function createAdapter(timeoutPerAttemptMs: number) {
  return createOpenAIEmbeddingAdapter({
    model: 'text-embedding-3-small',
    apiKey: 'test-key',
    retry: { maxAttempts: 1, backoffBaseMs: 0, maxBackoffMs: 0 },
    timeout: { perAttemptMs: timeoutPerAttemptMs },
  });
}

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

describe('§20.10 executeEmbedding — timeout covers the response body', () => {
  it('T-EE-40 | stalled body fails with TimeoutError bounded by perAttemptMs', async () => {
    vi.stubGlobal('fetch', createStallingBodyFetch({ status: 200 }));
    const adapter = createAdapter(60);
    const startedAt = Date.now();

    const error = await captureFailure(adapter.embed(['a', 'b']));
    const elapsed = Date.now() - startedAt;

    expect(error).toBeInstanceOf(TimeoutError);
    expect((error as TimeoutError).timeoutMs).toBe(60);
    expect(elapsed).toBeLessThan(1500);
  });

  it('T-EE-41 | a completed body is materialized exactly once and vectors are returned', async () => {
    const counting = createCountingBodyFetch(EMBEDDING_BODY);
    vi.stubGlobal('fetch', counting.fetch);
    const adapter = createAdapter(1000);

    const vectors = await adapter.embed(['a', 'b']);

    expect(vectors).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);
    expect(counting.bodyReads()).toBe(1);
  });
});
