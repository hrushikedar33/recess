import { BlockedApp } from '../../core/types/domain.types';

/** One line under an app's name on Home: its session limit, cooldown and daily budget. */
export function describeLimits(app: BlockedApp): string {
  const daily =
    app.dailyLimitMinutes === undefined
      ? 'no daily cap'
      : `${app.dailyLimitMinutes} min/day`;
  return `${app.limitMinutes} min session · ${app.cooldownMinutes} min cooldown · ${daily}`;
}

export interface LimitChip {
  /** What is drawn on the tag. */
  label: string;
  /** What a screen reader says: no abbreviations. */
  spoken: string;
}

const plural = (count: number, unit: string) =>
  count === 1 ? `1 ${unit}` : `${count} ${unit}s`;

/** The limits as three short tags: session, break and daily budget. */
export function limitChips(app: BlockedApp): LimitChip[] {
  const daily: LimitChip =
    app.dailyLimitMinutes === undefined
      ? { label: 'no cap', spoken: 'no daily cap' }
      : {
          label: `${app.dailyLimitMinutes} min/day`,
          spoken: `${plural(app.dailyLimitMinutes, 'minute')} a day`,
        };
  return [
    {
      label: `${app.limitMinutes} min/sesh`,
      spoken: `${app.limitMinutes} minute ${
        app.limitMinutes === 1 ? 'session' : 'sessions'
      }`,
    },
    {
      label: `${app.cooldownMinutes} min break`,
      spoken: `${app.cooldownMinutes} minute break`,
    },
    daily,
  ];
}
