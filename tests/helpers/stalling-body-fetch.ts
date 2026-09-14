// Test-time helper (not production code).
//
// A transport that answers headers immediately but never completes the body.
// It exists to prove that the engine's per-attempt timeout covers the whole
// response lifecycle — header phase and body phase — not only the header
// phase. It also provides a counting transport that records how many times the
// body was materialized.

import type { MockFetch, MockFetchCall } from './mock-fetch.js';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

export interface StallingBodyFetchOptions {
  readonly status?: number;
  readonly headers?: Record<string, string>;
}

function resolveUrl(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return (input as { url: string }).url;
}

function parseJsonBody(body: FetchInit['body']): unknown {
  if (typeof body !== 'string') return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

/**
 * Returns a fetch mock whose responses expose headers and then never emit body
 * bytes. The returned stream errors when the request signal aborts, mirroring
 * real transports that tear the body down on abort.
 */
export function createStallingBodyFetch(options: StallingBodyFetchOptions = {}): MockFetch {
  const calls: MockFetchCall[] = [];
  const status = options.status ?? 200;
  const impl = (input: FetchInput, init?: FetchInit): Promise<Response> => {
    const effectiveInit = (init ?? {}) as FetchInit;
    calls.push({
      url: resolveUrl(input),
      init: effectiveInit,
      body: parseJsonBody(effectiveInit.body),
    } as unknown as MockFetchCall);

    const signal = effectiveInit.signal ?? undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(controller): void {
        if (signal === undefined) return;
        const abort = (): void => {
          controller.error(signal.reason);
        };
        if (signal.aborted) {
          abort();
          return;
        }
        signal.addEventListener('abort', abort, { once: true });
      },
    });

    const headers = new Headers({
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    });
    return Promise.resolve(new Response(stream, { status, headers }));
  };

  const mock = impl as MockFetch;
  mock.calls = calls;
  mock.reset = (): void => {
    calls.length = 0;
  };
  return mock;
}

export interface CountingBodyFetch {
  readonly fetch: MockFetch;
  readonly bodyReads: () => number;
}

/**
 * Returns a fetch mock that answers with a complete JSON body and counts how
 * many times that body was materialized. The engine must read a body exactly
 * once per attempt.
 */
export function createCountingBodyFetch(body: unknown): CountingBodyFetch {
  const calls: MockFetchCall[] = [];
  let reads = 0;
  const impl = (input: FetchInput, init?: FetchInit): Promise<Response> => {
    const effectiveInit = (init ?? {}) as FetchInit;
    calls.push({
      url: resolveUrl(input),
      init: effectiveInit,
      body: parseJsonBody(effectiveInit.body),
    } as unknown as MockFetchCall);
    const response = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async (): Promise<string> => {
        reads += 1;
        return JSON.stringify(body);
      },
    } as unknown as Response;
    return Promise.resolve(response);
  };

  const mock = impl as MockFetch;
  mock.calls = calls;
  mock.reset = (): void => {
    calls.length = 0;
  };
  return { fetch: mock, bodyReads: () => reads };
}
