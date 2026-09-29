import { BlockedApp } from '../../core/types/domain.types';

/** One line under an app's name on Home: its session limit, cooldown and daily budget. */
export function describeLimits(app: BlockedApp): string {
  const daily =
    app.dailyLimitMinutes === undefined
      ? 'no daily cap'
      : `${app.dailyLimitMinutes} min/day`;
  return `${app.limitMinutes} min session · ${app.cooldownMinutes} min cooldown · ${daily}`;
}
