import { describeLimits, limitChips } from '@features/home/limit-summary';

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

describe('limitChips', () => {
  it('gives one short tag per limit, in the order you read them', () => {
    expect(limitChips({ ...base, dailyLimitMinutes: 60 })).toEqual([
      { label: '10 min/sesh', spoken: '10 minute sessions' },
      { label: '5 min break', spoken: '5 minute break' },
      { label: '60 min/day', spoken: '60 minutes a day' },
    ]);
  });

  it('says no cap when there is no daily budget', () => {
    const chips = limitChips(base);

    expect(chips[2]).toEqual({ label: 'no cap', spoken: 'no daily cap' });
  });

  it('says "1 minute" in the singular for a screen reader', () => {
    const chips = limitChips({ ...base, limitMinutes: 1, cooldownMinutes: 1 });

    expect(chips[0].spoken).toBe('1 minute session');
    expect(chips[1].spoken).toBe('1 minute break');
  });
});
