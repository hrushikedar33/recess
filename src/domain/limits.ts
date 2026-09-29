import { BlockedApp } from '../core/types/domain.types';

export interface LimitValues {
  limitMinutes: number;
  cooldownMinutes: number;
  /** Null or undefined means "no daily cap". */
  dailyLimitMinutes?: number | null;
}

/** A message for the first problem with the values, or null if they can be saved. */
export function validateLimits({
  limitMinutes,
  cooldownMinutes,
  dailyLimitMinutes,
}: LimitValues): string | null {
  if (limitMinutes < 1) {
    return 'The session limit must be at least 1 minute.';
  }
  if (cooldownMinutes < 1) {
    return 'The cooldown must be at least 1 minute.';
  }
  if (
    dailyLimitMinutes !== null &&
    dailyLimitMinutes !== undefined &&
    dailyLimitMinutes < limitMinutes
  ) {
    // The session limit could then never be reached: the day would run out first.
    return 'The daily budget must be at least as long as one session.';
  }
  return null;
}

export function describeLimits(app: BlockedApp): string {
  const daily =
    app.dailyLimitMinutes === undefined
      ? 'no daily cap'
      : `${app.dailyLimitMinutes} min/day`;
  return `${app.limitMinutes} min session · ${app.cooldownMinutes} min cooldown · ${daily}`;
}
