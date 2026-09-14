// Shared fetch-with-abort wrapper for execute-call and execute-embedding.
// Races the aggregate transport operation (headers + body) against an abort
// promise to cover mocks that do not honor the signal (NIB-T §27.6 mock-fetch)
// and to keep the per-attempt timeout in force for the whole response
// lifecycle, not only the header phase (NIB-M-EXECUTE-CALL §3.19-3.21).

/**
 * Normalize response headers to lowercase keys (I-13).
 * Shared by execute-call and execute-embedding.
 */
export function normalizeHeaders(responseHeaders: Headers): Record<string, string> {
  const headers: Record<string, string> = {};
  responseHeaders.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return headers;
}

/**
 * A transport result whose body has been materialized exactly once under the
 * composed abort signal. Engines must read `bodyText` instead of calling
 * `response.text()` again.
 */
export interface FetchedResponse {
  readonly response: Response;
  readonly bodyText: string;
}

export async function runFetch(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal,
): Promise<FetchedResponse> {
  const init: RequestInit = {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  };
  const transport = (async (): Promise<FetchedResponse> => {
    const response = await fetchImpl(url, init);
    const bodyText = await response.text();
    return { response, bodyText };
  })();
  const abortPromise = new Promise<never>((_resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
  return Promise.race([transport, abortPromise]);
}
