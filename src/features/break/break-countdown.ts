/** Whole seconds left until [endMs], rounded up so the last moment shows 1, and never below zero. */
export function remainingSeconds(endMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((endMs - nowMs) / 1000));
}
