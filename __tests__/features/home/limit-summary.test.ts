import { describeLimits } from '@features/home/limit-summary';

const base = {
  packageName: 'p',
  appName: 'A',
  limitMinutes: 10,
  cooldownMinutes: 5,
  isActive: true,
};

describe('describeLimits', () => {
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
