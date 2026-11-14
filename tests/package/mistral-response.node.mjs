import assert from 'node:assert/strict';
import { test } from 'node:test';

const runtime = await import(
  process.env.LLM_PACKAGE_UNDER_TEST ?? new URL('../../dist/index.js', import.meta.url).href
);
const {
  createOpenAICompatibleAdapter,
  createOpenAIAdapter,
  createGoogleAdapter,
  ResponseParseError,
  TimeoutError,
  AbortedError,
} = runtime;
const sentinel = 'PRIVATE_REASONING_MUST_NOT_ESCAPE';
const final =
  '[{"commit":{"type":"fix","description":"preserve synthetic changes"},"files":["synthetic.txt"]}]';
const chunks = [
  { type: 'thinking', thinking: [{ type: 'text', text: sentinel }] },
  { type: 'text', text: final.slice(0, 34) },
  { type: 'text', text: final.slice(34) },
];
const body = (content) => ({
  id: 'synthetic-response',
  model: 'synthetic-model',
  choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
});
const request = { messages: [{ role: 'user', content: 'Synthetic data only' }], maxTokens: 128 };
function config(fetch, events = []) {
  return {
    model: 'synthetic-model',
    apiKey: 'synthetic',
    sanitization: { stripThinkingTags: false, stripJsonFence: false },
    retry: { maxAttempts: 3, backoffBaseMs: 0, maxBackoffMs: 0 },
    timeout: { perAttemptMs: 50 },
    providerOptions: { fetch },
    logging: { logger: { emit: (event) => events.push(event) } },
  };
}
for (const [name, content] of [
  ['string', final],
  ['Mistral chunks', chunks],
])
  test(`compiled/public adapter preserves ${name} and metadata with no reasoning leak`, async () => {
    let sends = 0;
    const events = [];
    const adapter = createOpenAICompatibleAdapter({
      ...config(async () => {
        sends++;
        return new Response(JSON.stringify(body(content)));
      }, events),
      provider: 'mistral',
    });
    const before = structuredClone(request);
    const r = await adapter.call(request);
    assert.equal(r.content, final);
    assert.equal(r.rawContent, final);
    assert.deepEqual(JSON.parse(r.content), JSON.parse(final));
    assert.equal(r.provider, 'mistral');
    assert.equal(r.providerModel, 'synthetic-model');
    assert.equal(r.termination, 'completed');
    assert.deepEqual(r.usage, { inputTokens: 10, outputTokens: 20, totalTokens: 30 });
    assert.equal(r.attemptCount, 1);
    assert.equal(sends, 1);
    assert.equal(adapter.stats.totalInputTokens, 10);
    assert.equal(adapter.stats.totalOutputTokens, 20);
    assert.deepEqual(request, before);
    assert.ok(!JSON.stringify(r).includes(sentinel));
    assert.ok(!JSON.stringify(events).includes(sentinel));
    assert.equal(events.filter((e) => e.eventType === 'llm_call_end').length, 1);
  });
for (const content of [
  [],
  [chunks[0]],
  [{ type: 'text', text: '' }],
  [{ type: 'text', text: 7 }],
  [{ type: 'unknown', text: sentinel }],
  [
    { type: 'thinking', thinking: sentinel },
    { type: 'text', text: final },
  ],
  [null],
  null,
])
  test('malformed Mistral content terminates after one send without leaking diagnostics or retrying', async () => {
    let sends = 0;
    const events = [];
    const adapter = createOpenAICompatibleAdapter({
      ...config(async () => {
        sends++;
        return new Response(JSON.stringify(body(content)));
      }, events),
      provider: 'mistral',
    });
    let error;
    try {
      await adapter.call(request);
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof ResponseParseError);
    assert.equal(error.kind, 'response_parse');
    assert.equal(error.attempts, 1);
    assert.equal(error.provider, 'mistral');
    assert.ok(error.callId);
    assert.equal(sends, 1);
    assert.equal(adapter.stats.totalCalls, 0);
    assert.ok(!JSON.stringify(events).includes(sentinel));
    assert.ok(!String(error).includes(sentinel));
    assert.equal(error.cause, undefined);
    assert.equal(events.filter((e) => e.eventType === 'llm_call_parse_error').length, 1);
    assert.equal(events.filter((e) => e.eventType === 'llm_call_retry_scheduled').length, 0);
  });
test('Mistral invalid usage is typed, valid optional usage/termination remains unchanged', async () => {
  const invoke = (response) =>
    createOpenAICompatibleAdapter({
      ...config(async () => new Response(JSON.stringify(response))),
      provider: 'mistral',
    }).call(request);
  await assert.rejects(
    invoke({ ...body(chunks), usage: { completion_tokens: -1 } }),
    ResponseParseError,
  );
  const response = body(chunks);
  response.choices[0].finish_reason = 'length';
  const truncated = await createOpenAICompatibleAdapter({
    ...config(async () => new Response(JSON.stringify(response))),
    provider: 'mistral',
    integrity: { failOnSilentTruncation: true },
  }).call(request);
  assert.equal(truncated.termination, 'max_tokens');
  assert.deepEqual(truncated.integrity, {
    truncationDetected: true,
    truncationMode: 'explicit_max_tokens',
  });
});
test('plain empty string remains valid historical behavior', async () => {
  const r = await createOpenAICompatibleAdapter({
    ...config(async () => new Response(JSON.stringify(body('')))),
    provider: 'mistral',
  }).call(request);
  assert.equal(r.rawContent, '');
  assert.equal(r.content, '');
});
test('other providers keep their historical string and unsupported-list behavior', async () => {
  for (const provider of ['openai', 'deepseek', 'groq', 'together', 'ollama']) {
    for (const content of ['plain text', chunks]) {
      const c = config(async () => new Response(JSON.stringify(body(content))));
      const adapter =
        provider === 'openai'
          ? createOpenAIAdapter(c)
          : createOpenAICompatibleAdapter({ ...c, provider });
      const r = await adapter.call(request);
      assert.equal(r.rawContent, typeof content === 'string' ? content : '');
    }
  }
  const google = createGoogleAdapter(
    config(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: 'Google unchanged' }] }, finishReason: 'STOP' },
            ],
          }),
        ),
    ),
  );
  assert.equal((await google.call(request)).content, 'Google unchanged');
});
test('per-attempt body deadline and cancellation remain owned by the compiled engine', async () => {
  const adapter = createOpenAICompatibleAdapter({
    ...config(async () => ({
      status: 200,
      ok: true,
      headers: new Headers(),
      text: () => new Promise(() => {}),
    })),
    provider: 'mistral',
    retry: { maxAttempts: 1, backoffBaseMs: 0, maxBackoffMs: 0 },
  });
  await assert.rejects(adapter.call(request), TimeoutError);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(adapter.call(request, { signal: controller.signal }), AbortedError);
});
