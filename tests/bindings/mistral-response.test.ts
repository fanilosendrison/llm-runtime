import { describe, expect, it } from 'vitest';
import { openaiBinding } from '../../src/bindings/openai.js';
import { createOpenAICompatibleBinding } from '../../src/bindings/openai-compatible.js';
import { ResponseParseError } from '../../src/errors/index.js';

const binding = createOpenAICompatibleBinding('mistral');
const secret = 'PRIVATE_REASONING_SENTINEL';
const envelope = (content: unknown, extra: Record<string, unknown> = {}) => ({
  id: 'response-1',
  model: 'mistral-large-latest',
  choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 7, completion_tokens: 13, total_tokens: 20 },
  ...extra,
});
const thinking = {
  type: 'thinking',
  thinking: [{ type: 'text', text: secret }],
  signature: 'opaque',
  closed: true,
};
const parse = (body: unknown) => binding.parseResponse(body, {});

describe('Mistral final-answer decoding', () => {
  it('preserves historical strings, including the explicitly supported empty string', () => {
    for (const text of ['answer', '', '  ', '<think>literal</think>', 'é😀\n']) {
      expect(parse(envelope(text)).rawContent).toBe(text);
    }
  });
  it('extracts ordered final text without separators, thinking, mutation or metadata loss', () => {
    const body = envelope([
      thinking,
      { type: 'text', text: '[{"a":' },
      { type: 'thinking', thinking: [] },
      { type: 'text', text: '"é😀"}]' },
    ]);
    const before = structuredClone(body);
    const result = parse(body);
    expect(result).toEqual({
      rawContent: '[{"a":"é😀"}]',
      terminationSignal: 'stop',
      usage: { inputTokens: 7, outputTokens: 13, totalTokens: 20 },
      providerResponseId: 'response-1',
      providerModel: 'mistral-large-latest',
    });
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(body).toEqual(before);
  });
  it('ignores documented reference/tool-reference data only inside validated thinking', () => {
    const result = parse(
      envelope([
        {
          type: 'thinking',
          thinking: [
            { type: 'reference', reference_ids: [1, 'opaque'] },
            { type: 'tool_reference', tool: 'web_search', title: secret, url: null },
          ],
        },
        { type: 'text', text: 'final' },
      ]),
    );
    expect(result.rawContent).toBe('final');
    expect(JSON.stringify(result)).not.toContain(secret);
  });
  it('keeps absent usage absent and maps valid partial usage without invented counts', () => {
    const body = {
      choices: [{ message: { content: [{ type: 'text', text: 'ok' }] }, finish_reason: 'length' }],
    };
    expect(parse(body)).toEqual({ rawContent: 'ok', terminationSignal: 'length', usage: {} });
    expect(parse(envelope('ok', { usage: { prompt_tokens: 0 } })).usage).toEqual({
      inputTokens: 0,
    });
  });
});

const invalidContents: [string, unknown][] = [
  ['null', null],
  ['missing', undefined],
  ['number', 1],
  ['object', { type: 'text', text: 'x' }],
  ['empty array', []],
  ['thinking only', [thinking]],
  ['no final bytes', [{ type: 'text', text: '' }]],
  [
    'whitespace is not missing text',
    [
      { type: 'text', text: ' ' },
      { type: 'image_url', image_url: secret },
    ],
  ],
  [
    'unknown',
    [
      { type: 'unknown', text: secret },
      { type: 'text', text: 'ok' },
    ],
  ],
  ['null segment', [null]],
  ['nested array', [[{ type: 'text', text: 'x' }]]],
  ['string segment', ['x']],
  ['text number', [{ type: 'text', text: 4 }]],
  ['text missing', [{ type: 'text' }]],
  ['implicit type', [{ text: 'x' }]],
  ['extra text field', [{ type: 'text', text: 'ok', thinking: secret }]],
  [
    'thinking not array',
    [
      { type: 'thinking', thinking: secret },
      { type: 'text', text: 'ok' },
    ],
  ],
  [
    'thinking malformed text',
    [
      { type: 'thinking', thinking: [{ type: 'text', text: 1 }] },
      { type: 'text', text: 'ok' },
    ],
  ],
  [
    'thinking unknown nested',
    [
      { type: 'thinking', thinking: [{ type: 'image_url', url: secret }] },
      { type: 'text', text: 'ok' },
    ],
  ],
  [
    'thinking bad signature',
    [
      { ...thinking, signature: 1 },
      { type: 'text', text: 'ok' },
    ],
  ],
  [
    'thinking bad closed',
    [
      { ...thinking, closed: 'true' },
      { type: 'text', text: 'ok' },
    ],
  ],
];
for (const [name, content] of invalidContents)
  it(`rejects ${name} with a typed content-free diagnostic`, () => {
    let caught: unknown;
    try {
      parse(envelope(content));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ResponseParseError);
    expect((caught as Error).message).toMatch(/^mistral:/);
    expect(String(caught)).not.toContain(secret);
    expect((caught as Error).cause).toBeUndefined();
  });
for (const body of [
  null,
  [],
  {},
  { choices: [null] },
  { choices: [[]] },
  { choices: [{ message: null }] },
  { choices: [{ message: [] }] },
  envelope('ok', { id: 7 }),
  envelope('ok', { model: {} }),
  envelope('ok', { usage: [] }),
  envelope('ok', { usage: 'private' }),
  ...[-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '7'].map((prompt_tokens) =>
    envelope('ok', { usage: { prompt_tokens } }),
  ),
])
  it('rejects malformed Mistral envelopes/usage as ResponseParseError, never generic TypeError', () => {
    expect(() => parse(body)).toThrow(ResponseParseError);
  });
for (const key of ['prompt_tokens', 'completion_tokens', 'total_tokens']) {
  for (const count of [-1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '7', null]) {
    it(`rejects malformed supplied ${key} without quoting its value`, () => {
      expect(() => parse(envelope('ok', { usage: { [key]: count } }))).toThrow(ResponseParseError);
    });
  }
}
for (const choices of [
  [],
  null,
  'not-an-array',
  [{ message: { content: 'ok' }, finish_reason: 7 }],
]) {
  it('rejects invalid choices or missing/non-string termination', () => {
    expect(() => parse({ choices })).toThrow(ResponseParseError);
  });
}
it('does not infer usage arithmetic or provider termination semantics', () => {
  const body = envelope([{ type: 'text', text: 'ok' }], {
    usage: { prompt_tokens: 7, completion_tokens: 13, total_tokens: 25 },
  });
  body.choices[0]!.finish_reason = 'future_reason';
  expect(parse(body).usage).toEqual({ inputTokens: 7, outputTokens: 13, totalTokens: 25 });
  expect(parse(body).terminationSignal).toBe('future_reason');
});
it('does not extend any other provider response contract by inference', () => {
  const body = envelope([thinking, { type: 'text', text: 'final' }]);
  expect(openaiBinding.parseResponse(body, {}).rawContent).toBe('');
  for (const provider of ['deepseek', 'groq', 'together', 'ollama'] as const) {
    expect(createOpenAICompatibleBinding(provider).parseResponse(body, {}).rawContent).toBe('');
  }
});
