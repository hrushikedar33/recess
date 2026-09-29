import { oemGuidance } from '@features/home/oem-guidance';

describe('oemGuidance', () => {
  it.each(['OnePlus', 'OPPO', 'realme', 'ONEPLUS'])(
    'has battery steps for %s',
    (maker) => {
      const guidance = oemGuidance(maker);

      expect(guidance).not.toBeNull();
      expect(guidance?.steps).toMatch(/battery/i);
    },
  );

  it.each(['Xiaomi', 'Redmi', 'POCO'])(
    'has autostart steps for %s',
    (maker) => {
      expect(oemGuidance(maker)?.steps).toMatch(/autostart/i);
    },
  );

  it('has steps for Samsung', () => {
    expect(oemGuidance('samsung')?.steps).toMatch(/sleeping/i);
  });

  it('has nothing to say for a phone that does not need it', () => {
    expect(oemGuidance('Google')).toBeNull();
    expect(oemGuidance('')).toBeNull();
    expect(oemGuidance(undefined)).toBeNull();
  });

  it('never suggests hard-coded system screens, only steps the user follows', () => {
    const steps = oemGuidance('OnePlus')?.steps ?? '';

    expect(steps).not.toMatch(/com\.\w+\./);
  });
});
