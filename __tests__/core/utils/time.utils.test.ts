import {
  formatDuration,
  minutesToMs,
  msToMinutes,
} from '@core/utils/time.utils';

describe('time.utils', () => {
  describe('formatDuration', () => {
    it('formats whole minutes as m:00', () => {
      expect(formatDuration(120)).toBe('2:00');
    });

    it('zero-pads the seconds', () => {
      expect(formatDuration(65)).toBe('1:05');
    });

    it('formats zero as 0:00', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('does not roll minutes over into hours', () => {
      expect(formatDuration(3600)).toBe('60:00');
    });
  });

  describe('minutesToMs', () => {
    it('converts minutes to milliseconds', () => {
      expect(minutesToMs(2)).toBe(120000);
    });
  });

  describe('msToMinutes', () => {
    it('converts milliseconds to fractional minutes', () => {
      expect(msToMinutes(90000)).toBe(1.5);
    });
  });
});
