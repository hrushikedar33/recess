/** Delay for the [index]th item of a list that animates in one after another, capped so long lists stay snappy. */
export function staggerDelay(index: number, stepMs = 45, maxMs = 360): number {
  if (!Number.isFinite(index) || index < 0) {
    return 0;
  }
  return Math.min(index * stepMs, maxMs);
}
