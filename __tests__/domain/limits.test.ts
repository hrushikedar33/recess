import { describeLimits, validateLimits } from '@domain/limits';

describe('validateLimits', () => {
  it('accepts a session limit below the daily budget', () => {
    expect(
      validateLimits({
        limitMinutes: 10,
        cooldownMinutes: 10,
        dailyLimitMinutes: 60,
      }),
    ).toBeNull();
  });

  it('accepts a daily budget equal to the session limit', () => {
    expect(
      validateLimits({
        limitMinutes: 30,
        cooldownMinutes: 5,
        dailyLimitMinutes: 30,
      }),
    ).toBeNull();
  });

  it('accepts having no daily budget at all', () => {
    expect(
      validateLimits({
        limitMinutes: 10,
        cooldownMinutes: 10,
        dailyLimitMinutes: null,
      }),
    ).toBeNull();
    expect(
      validateLimits({ limitMinutes: 10, cooldownMinutes: 10 }),
    ).toBeNull();
  });

  it('rejects a daily budget smaller than the session limit, since the session limit could never be reached', () => {
    expect(
      validateLimits({
        limitMinutes: 30,
        cooldownMinutes: 5,
        dailyLimitMinutes: 15,
      }),
    ).toBe('The daily budget must be at least as long as one session.');
  });

  it('rejects a cooldown shorter than a minute', () => {
    expect(
      validateLimits({
        limitMinutes: 10,
        cooldownMinutes: 0,
        dailyLimitMinutes: 60,
      }),
    ).toBe('The cooldown must be at least 1 minute.');
  });

  it('rejects a session limit shorter than a minute', () => {
    expect(
      validateLimits({
        limitMinutes: 0,
        cooldownMinutes: 5,
        dailyLimitMinutes: 60,
      }),
    ).toBe('The session limit must be at least 1 minute.');
  });
});

describe('describeLimits', () => {
  const base = {
    packageName: 'p',
    appName: 'A',
    limitMinutes: 10,
    cooldownMinutes: 5,
    isActive: true,
  };

  it('lists the session limit, cooldown and daily budget', () => {
    expect(describeLimits({ ...base, dailyLimitMinutes: 60 })).toBe(
      '10 min session · 5 min cooldown · 60 min/day',
    );
  });

  it('says there is no daily budget for a rule saved before daily budgets existed', () => {
    expect(describeLimits(base)).toBe(
      '10 min session · 5 min cooldown · no daily cap',
    );
  });
});
