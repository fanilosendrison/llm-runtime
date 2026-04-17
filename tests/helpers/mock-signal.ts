// NIB-T §27.4 — controlled AbortSignal for precise cancellation tests.
// Test-time utility (not production code).

export interface ControlledSignal {
  readonly signal: AbortSignal;
  abort(reason?: unknown): void;
  abortAfter(ms: number, reason?: unknown): void;
}

export function createControlledSignal(): ControlledSignal {
  const controller = new AbortController();

  return {
    signal: controller.signal,
    abort(reason?: unknown): void {
      controller.abort(reason);
    },
    abortAfter(ms: number, reason?: unknown): void {
      setTimeout(() => {
        controller.abort(reason);
      }, ms);
    },
  };
}
