import {
  PERMISSION_BANNER_TEXT,
  nextMissingPermission,
} from '@features/home/permission-steps';

const all = { usage: true, overlay: true, battery: true };

describe('nextMissingPermission', () => {
  it('is nothing when everything is granted', () => {
    expect(nextMissingPermission(all)).toBeNull();
  });

  it('asks for Usage Access first, whatever else is missing', () => {
    expect(
      nextMissingPermission({ usage: false, overlay: false, battery: false }),
    ).toBe('usage');
    expect(nextMissingPermission({ ...all, usage: false })).toBe('usage');
  });

  it('asks for the overlay next', () => {
    expect(
      nextMissingPermission({ usage: true, overlay: false, battery: false }),
    ).toBe('overlay');
    expect(nextMissingPermission({ ...all, overlay: false })).toBe('overlay');
  });

  it('asks about battery optimisation last', () => {
    expect(nextMissingPermission({ ...all, battery: false })).toBe('battery');
  });
});

describe('PERMISSION_BANNER_TEXT', () => {
  it('says something different and specific for every step', () => {
    expect(PERMISSION_BANNER_TEXT.usage).toContain('Usage Access');
    expect(PERMISSION_BANNER_TEXT.overlay).toContain('Display over other apps');
    expect(PERMISSION_BANNER_TEXT.battery).toContain('battery optimization');
  });
});
