import { remainingSeconds } from '@features/break/break-countdown';

describe('remainingSeconds', () => {
  it('counts whole seconds until the break ends, rounding up', () => {
    expect(remainingSeconds(10_000, 4_500)).toBe(6);
  });

  it('is zero exactly when the break ends', () => {
    expect(remainingSeconds(10_000, 10_000)).toBe(0);
  });

  it('never goes negative once the break is over', () => {
    expect(remainingSeconds(10_000, 99_000)).toBe(0);
  });

  it('shows the last partial second as one second, not zero', () => {
    expect(remainingSeconds(10_000, 9_999)).toBe(1);
  });
});
