# @vegacorp/llm-runtime

> TypeScript runtime for LLM provider orchestration — one normalized engine for Anthropic, OpenAI, Google Gemini, and any OpenAI-compatible provider.

[![CI](https://github.com/fanilosendrison/llm-runtime/actions/workflows/ci.yml/badge.svg)](https://github.com/fanilosendrison/llm-runtime/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

## Features

- **Multi-provider** — Anthropic (Claude), OpenAI (GPT), Google (Gemini), plus OpenAI-compatible providers (DeepSeek, Mistral, Groq, Together, Ollama)
- **Embeddings** — OpenAI embeddings with automatic batching
- **Automatic retries** — Configurable retry policy with exponential backoff and jitter
- **Rate-limit aware** — Built-in throttle resolver using provider rate-limit headers
- **Error taxonomy** — 11 typed error classes with semantic `kind` discriminant
- **Response sanitization** — Automatic stripping of thinking tags and JSON fences
- **Integrity checks** — Detects silent truncation, model mismatch, and unknown termination reasons
- **Observability** — 15 structured event types emitted via pluggable `LLMLogger`
- **Zero runtime dependencies** — Only `ulid` (ID generation) and `ai-json-safe-parse`
- **Strict TypeScript** — Full strict mode with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and more

## Quick Start

### Install

```bash
npm install @vegacorp/llm-runtime
# or
pnpm add @vegacorp/llm-runtime
```

### Basic Completion

```typescript
import { createAnthropicAdapter, buildSimplePrompt } from '@vegacorp/llm-runtime';

const adapter = createAnthropicAdapter({
  model: 'claude-sonnet-4-20250514',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  sanitization: { stripThinkingTags: true, stripJsonFence: true },
});

const response = await adapter.call({
  messages: buildSimplePrompt({
    system: 'You are a helpful assistant.',
    user: 'What is the capital of France?',
  }),
  temperature: 0.7,
  maxTokens: 1024,
});

console.log(response.content);        // "The capital of France is Paris."
console.log(response.usage);          // { inputTokens: 25, outputTokens: 12, totalTokens: 37 }
console.log(response.termination);    // "completed"
console.log(response.durationMs);     // 842
console.log(adapter.stats);           // { totalCalls: 1, totalInputTokens: 25, ... }
```

### OpenAI

```typescript
import { createOpenAIAdapter } from '@vegacorp/llm-runtime';

const adapter = createOpenAIAdapter({
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY!,
  sanitization: {},
});

const response = await adapter.call({
  messages: [
    { role: 'user', content: 'Explain quantum computing in one sentence.' },
  ],
  maxTokens: 100,
});
```

### Google Gemini

```typescript
import { createGoogleAdapter } from '@vegacorp/llm-runtime';

const adapter = createGoogleAdapter({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY!,
  sanitization: {},
});
```

### OpenAI-Compatible Providers

Works with DeepSeek, Mistral, Groq, Together, and Ollama:

```typescript
import { createOpenAICompatibleAdapter } from '@vegacorp/llm-runtime';

const adapter = createOpenAICompatibleAdapter({
  provider: 'deepseek',  // 'mistral' | 'groq' | 'together' | 'ollama'
  model: 'deepseek-chat',
  apiKey: process.env.DEEPSEEK_API_KEY!,
  sanitization: {},
  endpoint: 'https://api.deepseek.com/v1/chat/completions', // optional override
});
```

### Embeddings

```typescript
import { createOpenAIEmbeddingAdapter } from '@vegacorp/llm-runtime';

const embedder = createOpenAIEmbeddingAdapter({
  model: 'text-embedding-3-small',
  apiKey: process.env.OPENAI_API_KEY!,
  batchSize: 100,  // optional, texts are auto-batched
});

const vectors = await embedder.embed(['Hello world', 'Bonjour le monde']);
// vectors[0] → number[1536], vectors[1] → number[1536]
```

## Configuration

### AdapterConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | `string` | ✅ | Model identifier (e.g. `claude-sonnet-4-20250514`, `gpt-4o`) |
| `apiKey` | `string` | ✅ | Provider API key |
| `endpoint` | `string` | – | Custom API endpoint URL |
| `sanitization` | `SanitizationPolicy` | ✅ | Response sanitization config |
| `retry` | `RetryPolicy` | – | Retry behavior (defaults applied by engine) |
| `timeout` | `TimeoutPolicy` | – | Per-attempt timeout |
| `integrity` | `IntegrityPolicy` | – | Response integrity checks |
| `logging` | `LoggingPolicy` | – | Observability config |
| `providerOptions` | `unknown` | – | Provider-specific options pass-through |

### Policies

```typescript
// Retry with exponential backoff
const adapter = createAnthropicAdapter({
  model: 'claude-sonnet-4-20250514',
  apiKey: '...',
  sanitization: {},
  retry: {
    maxAttempts: 3,
    backoffBaseMs: 1000,
    maxBackoffMs: 30_000,
  },
  timeout: {
    perAttemptMs: 60_000,
  },
  integrity: {
    detectHeuristicTruncation: true,
    failOnSilentTruncation: true,
    failOnUnknownTermination: false,
    failOnModelMismatch: false,
  },
});
```

## Error Handling

All errors extend `LLMRuntimeError` with a typed `kind` discriminant:

```typescript
import {
  type LLMRuntimeError,
  AuthError,
  RateLimitError,
  TimeoutError,
  InvalidRequestError,
} from '@vegacorp/llm-runtime';

try {
  const response = await adapter.call(request);
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${err.retryAfterMs}ms`);
  } else if (err instanceof AuthError) {
    console.log('Invalid API key');
  } else if (err instanceof TimeoutError) {
    console.log(`Timed out after ${err.timeoutMs}ms`);
  }

  // Or use the kind discriminant:
  if (err instanceof LLMRuntimeError) {
    switch (err.kind) {
      case 'rate_limit':
      case 'overloaded':
      case 'transient_provider':
        // Retriable errors
        break;
      case 'auth':
      case 'invalid_request':
      case 'content_filter':
        // Non-retriable errors
        break;
    }
  }
}
```

### Error Taxonomy

| Error Class | `kind` | Retriable | Description |
|-------------|--------|-----------|-------------|
| `AuthError` | `auth` | ❌ | Invalid or missing API key |
| `InvalidRequestError` | `invalid_request` | ❌ | Malformed request parameters |
| `RateLimitError` | `rate_limit` | ✅ | Provider rate limit hit |
| `OverloadedError` | `overloaded` | ✅ | Provider temporarily overloaded |
| `TransientProviderError` | `transient_provider` | ✅ | 5xx or network error |
| `ProviderProtocolError` | `provider_protocol` | ❌ | Unexpected response format |
| `ResponseParseError` | `response_parse` | ❌ | Cannot parse provider response |
| `TimeoutError` | `timeout` | ✅ | Per-attempt timeout exceeded |
| `AbortedError` | `aborted` | ❌ | Caller aborted via AbortSignal |
| `SilentTruncationError` | `silent_truncation` | ❌ | Response was silently truncated |
| `ContentFilterError` | `content_filter` | ❌ | Content blocked by safety filter |

## Observability

Plug in a logger to capture structured events:

```typescript
import type { LLMEvent, LLMLogger } from '@vegacorp/llm-runtime';

const logger: LLMLogger = {
  emit(event: LLMEvent) {
    console.log(JSON.stringify(event));
  },
};

const adapter = createAnthropicAdapter({
  model: 'claude-sonnet-4-20250514',
  apiKey: '...',
  sanitization: {},
  logging: { enabled: true, logger },
});
```

15 event types are emitted: `llm_call_start`, `llm_call_attempt_start`, `llm_call_throttled`, `llm_call_retry_scheduled`, `llm_call_fetch_error`, `llm_call_provider_error`, `llm_call_parse_error`, `llm_call_sanitized`, `llm_call_unknown_error_classified`, `llm_call_unknown_termination`, `llm_call_end`, `llm_embedding_start`, `llm_embedding_batch`, `llm_embedding_retry_scheduled`, `llm_embedding_end`.

## Cancellation

All calls support `AbortSignal`:

```typescript
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const response = await adapter.call(request, { signal: controller.signal });
} catch (err) {
  // err instanceof AbortedError
}
```

## Development

### Prerequisites

- Node >= 20 (22 LTS recommended)
- pnpm >= 10

### Setup

```bash
git clone git@github.com:fanilosendrison/llm-runtime.git
cd llm-runtime
pnpm install
pnpm check            # typecheck + lint + test
```

### Scripts

```bash
pnpm typecheck        # tsc --noEmit (strict)
pnpm lint             # biome check
pnpm lint:fix         # biome check --write
pnpm format           # biome format --write
pnpm test             # vitest run (619 tests)
pnpm test:watch       # vitest (watch mode)
pnpm build            # tsc -p tsconfig.build.json → dist/
pnpm check            # typecheck + lint + test (CI pipeline)
```

### Architecture

```
src/
├── bindings/          # Provider-specific HTTP request/response mapping
│   ├── anthropic.ts   # Claude API binding
│   ├── google.ts      # Gemini API binding
│   ├── openai.ts      # OpenAI API binding
│   ├── openai-compatible.ts  # DeepSeek, Mistral, Groq, Together, Ollama
│   └── openai-embeddings.ts  # OpenAI embeddings binding
├── engine/            # Core execution loop (retry, throttle, fetch)
│   ├── execute-call.ts       # Completion execution with full lifecycle
│   └── execute-embedding.ts  # Embedding execution with batching
├── errors/            # 11-class error taxonomy
├── factories/         # Public adapter constructors
├── infra/             # Clock, ULID, logger, stats utilities
├── services/          # Error classification, retry, sanitization, throttle
├── types.ts           # All public type definitions
└── index.ts           # Public API surface
```

## Specs

This project is spec-driven. The 17 normative specs (16 NIB + 1 DC) are in `specs/`.

## License

[MIT](LICENSE)
