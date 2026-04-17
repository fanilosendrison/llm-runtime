// NIB-M-THROTTLE — stubs only. RateLimitSnapshot is internal (not exported from index).

export type RateLimitSnapshotState = 'known' | 'unknown' | 'partial';

export interface RateLimitSnapshot {
  readonly remainingTokens: number;
  readonly resetTokensAt: number;
  readonly lastCallOutputTokens: number;
  readonly state: RateLimitSnapshotState;
}

export type ThrottleDecisionReason =
  | 'no_snapshot'
  | 'snapshot_unknown_quality'
  | 'budget_sufficient'
  | 'window_already_reset'
  | 'budget_insufficient';

export type ThrottleDecision =
  | { readonly throttle: false; readonly reason: ThrottleDecisionReason }
  | { readonly throttle: true; readonly waitMs: number; readonly reason: ThrottleDecisionReason };

export function resolveThrottleDecision(
  _snapshot: RateLimitSnapshot | null,
  _estimatedNextCallTokens: number,
  _nowMs: number,
): ThrottleDecision {
  throw new Error('Not implemented');
}
