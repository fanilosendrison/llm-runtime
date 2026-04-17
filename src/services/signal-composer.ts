// NIB-M-SIGNAL-COMPOSER — stubs only.

export interface ComposedSignal {
  readonly signal: AbortSignal;
  readonly cleanup: () => void;
}

export function composeSignal(
  _external: AbortSignal | undefined,
  _timeoutMs: number,
): ComposedSignal {
  throw new Error('Not implemented');
}

export function abortableSleep(_ms: number, _signal: AbortSignal): Promise<void> {
  throw new Error('Not implemented');
}
