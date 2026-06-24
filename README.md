# @fanilosendrison/llm-runtime

> One normalized TypeScript runtime for LLM completions and embeddings across Anthropic, OpenAI, Google Gemini, and any OpenAI-compatible provider.

[![CI](https://github.com/fanilosendrison/llm-runtime/actions/workflows/ci.yml/badge.svg)](https://github.com/fanilosendrison/llm-runtime/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

## Why llm-runtime?

Each LLM provider ships its own SDK with different error shapes, retry semantics, and response formats. Switching providers means rewriting glue code.

**llm-runtime gives you a single adapter interface** that normalizes:

- **Errors** — 11 typed error classes with a `kind` discriminant, consistent across all providers. No more parsing provider-specific HTTP codes.
- **Retries** — exponential backoff with jitter, rate-limit awareness, and per-attempt timeouts. Works the same for Anthropic, OpenAI, and Gemini.
- **Sanitization** — LLMs return noise: Claude wraps reasoning in thinking tags, models leak JSON fences. `sanitization` strips this automatically so you get clean content. The field is **mandatory** on every adapter: it forces you to decide what to strip instead of discovering garbled output in production.
- **Integrity** — detects silent truncation (response cut off mid-sentence without the provider telling you), model mismatch, and unknown termination reasons.
- **Observability** — 15 structured event types via a pluggable logger. No more grepping `console.log`.

Zero runtime dependencies beyond `ulid` and `ai-json-safe-parse`. Strict TypeScript throughout.

## Quick Start

### Install

```bash
npm install @fanilosendrison/llm-runtime
# or
pnpm add @fanilosendrison/llm-runtime
```

> **ESM only** — this package is pure ESM. Your project needs `"type": "module"` in `package.json` or you must use `.mjs` / `.mts` extensions.

### Your first call

```typescript
import { createAnthropicAdapter, buildSimplePrompt } from '@fanilosendrison/llm-runtime';

const llm = createAnthropicAdapter({
  model: 'claude-sonnet-4-20250514',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  sanitization: { stripThinkingTags: true, stripJsonFence: true },
});

const response = await llm.call({
  messages: buildSimplePrompt({
    system: 'You are a helpful assistant.',
    user: 'What is the capital of France?',
  }),
  temperature: 0.7,
  maxTokens: 1024,
});

console.log(response.content);     // "The capital of France is Paris."
console.log(response.usage);       // { inputTokens: 25, outputTokens: 12, totalTokens: 37 }
console.log(response.termination); // "completed"
console.log(response.durationMs);  // 842
console.log(llm.stats);            // { totalCalls: 1, totalInputTokens: 25, ... }
```

### Other providers

Same interface, different factory:

| Provider | Factory | Example model |
|----------|---------|---------------|
| OpenAI | `createOpenAIAdapter` | `gpt-4o` |
| Google Gemini | `createGoogleAdapter` | `gemini-2.5-flash` |
| DeepSeek, Mistral, Groq, Together, Ollama | `createOpenAICompatibleAdapter` | `deepseek-chat` |
| OpenAI Embeddings | `createOpenAIEmbeddingAdapter` | `text-embedding-3-small` |

```typescript
// OpenAI-compatible example (DeepSeek, Mistral, Groq, Together, Ollama)
import { createOpenAICompatibleAdapter } from '@fanilosendrison/llm-runtime';

const llm = createOpenAICompatibleAdapter({
  provider: 'deepseek',
  model: 'deepseek-chat',
  apiKey: process.env.DEEPSEEK_API_KEY!,
  sanitization: {},
});

// Embeddings
import { createOpenAIEmbeddingAdapter } from '@fanilosendrison/llm-runtime';

const embed = createOpenAIEmbeddingAdapter({
  model: 'text-embedding-3-small',
  apiKey: process.env.OPENAI_API_KEY!,
});

const vectors = await embed.embed(['Hello world', 'Bonjour le monde']);
// vectors[0] → number[1536], vectors[1] → number[1536]
```

## Error Handling

All errors extend `LLMRuntimeError` with a typed `kind` discriminant:

```typescript
import {
  type LLMRuntimeError,
  AuthError,
  RateLimitError,
  TimeoutError,
} from '@fanilosendrison/llm-runtime';

try {
  const response = await llm.call(request);
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${err.retryAfterMs}ms`);
  } else if (err instanceof AuthError) {
    console.log('Invalid API key');
  } else if (err instanceof TimeoutError) {
    console.log(`Timed out after ${err.timeoutMs}ms`);
  }

  // Or switch on the kind discriminant:
  if (err instanceof LLMRuntimeError) {
    switch (err.kind) {
      case 'rate_limit':
      case 'overloaded':
      case 'transient_provider':
        // Retriable — the engine already retried, but you can escalate
        break;
      case 'auth':
      case 'invalid_request':
      case 'content_filter':
        // Non-retriable — fix your config or request
        break;
    }
  }
}
```

## Configuration

All adapters accept the same shape. Only `model`, `apiKey`, and `sanitization` are required — defaults are applied for everything else.

```typescript
const llm = createAnthropicAdapter({
  model: 'claude-sonnet-4-20250514',
  apiKey: '...',
  sanitization: { stripThinkingTags: true, stripJsonFence: true },

  // Optional — defaults shown:
  retry:    { maxAttempts: 2, backoffBaseMs: 1000, maxBackoffMs: 30_000 },
  timeout:  { perAttemptMs: 60_000 },
  integrity: {
    detectHeuristicTruncation: true,
    failOnSilentTruncation: true,
    failOnUnknownTermination: false,
    failOnModelMismatch: false,
  },
  logging:  { enabled: false },
});
```

Cancellation via `AbortSignal` is supported on all calls:

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
await llm.call(request, { signal: controller.signal }); // throws AbortedError
```

## Development

```bash
git clone git@github.com:fanilosendrison/llm-runtime.git
cd llm-runtime
pnpm install
pnpm check          # typecheck + lint + test (619 tests)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, code style, and PR workflow.

## License

[MIT](LICENSE)
