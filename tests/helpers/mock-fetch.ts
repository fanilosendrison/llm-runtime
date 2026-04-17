// NIB-T §27.1 — programmable fetch mock + scenario fetch.
// Test-time utility (not production code).

// Node >=20 exposes fetch globally; we derive the argument types from it so the
// mock is drop-in compatible with `typeof fetch` without pulling lib.dom types.
type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;
type FetchBody = FetchInit['body'];

export interface MockResponse {
  readonly status: number;
  readonly body: unknown; // JS object, serialized to JSON by the mock
  readonly headers?: Record<string, string>;
  readonly delayMs?: number; // simulated latency (real timer)
  readonly throwError?: Error; // if defined, mock rejects instead of returning
}

export interface MockFetchCall {
  readonly url: string;
  readonly init: FetchInit;
  readonly body?: unknown; // parsed JSON body if init.body was a string
}

export interface MockFetch {
  (input: FetchInput, init?: FetchInit): Promise<Response>;
  calls: MockFetchCall[];
  reset(): void;
}

function resolveUrl(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  // Request-like: has a `url` string property.
  return (input as { url: string }).url;
}

function tryParseJsonBody(body: FetchBody | null | undefined): unknown {
  if (body === null || body === undefined) return undefined;
  if (typeof body !== 'string') return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function buildResponse(mock: MockResponse): Response {
  const headers = new Headers(mock.headers ?? {});
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const serialized = JSON.stringify(mock.body ?? null);
  return new Response(serialized, {
    status: mock.status,
    headers,
  });
}

async function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function produce(mock: MockResponse): Promise<Response> {
  if (mock.delayMs !== undefined && mock.delayMs > 0) {
    await delay(mock.delayMs);
  }
  if (mock.throwError !== undefined) {
    throw mock.throwError;
  }
  return buildResponse(mock);
}

function attachMockApi(
  fn: (input: FetchInput, init?: FetchInit) => Promise<Response>,
  calls: MockFetchCall[],
): MockFetch {
  const mock = fn as MockFetch;
  mock.calls = calls;
  mock.reset = (): void => {
    calls.length = 0;
  };
  return mock;
}

export function createMockFetch(
  response: MockResponse | (() => MockResponse),
): MockFetch {
  const calls: MockFetchCall[] = [];
  const impl = async (
    input: FetchInput,
    init?: FetchInit,
  ): Promise<Response> => {
    const effectiveInit: FetchInit = init ?? {};
    const call: MockFetchCall = {
      url: resolveUrl(input),
      init: effectiveInit,
      body: tryParseJsonBody(effectiveInit.body),
    };
    calls.push(call);
    const mockResponse = typeof response === 'function' ? response() : response;
    return produce(mockResponse);
  };
  return attachMockApi(impl, calls);
}

export function createScenarioFetch(responses: MockResponse[]): MockFetch {
  const calls: MockFetchCall[] = [];
  let index = 0;
  const impl = async (
    input: FetchInput,
    init?: FetchInit,
  ): Promise<Response> => {
    const effectiveInit: FetchInit = init ?? {};
    const call: MockFetchCall = {
      url: resolveUrl(input),
      init: effectiveInit,
      body: tryParseJsonBody(effectiveInit.body),
    };
    calls.push(call);
    const current = responses[index];
    if (current === undefined) {
      throw new Error(
        `createScenarioFetch: no response for call #${index + 1} (only ${responses.length} configured)`,
      );
    }
    index += 1;
    return produce(current);
  };
  return attachMockApi(impl, calls);
}
