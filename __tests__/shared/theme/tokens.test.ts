import { contrastRatio } from '@shared/theme/contrast';
import { palette, radius, space, typography } from '@shared/theme/tokens';

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for the same colour', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
  });

  it('does not depend on which colour is the foreground', () => {
    expect(contrastRatio('#D4FF3A', '#0A0A0C')).toBeCloseTo(
      contrastRatio('#0A0A0C', '#D4FF3A'),
      5,
    );
  });

  it('accepts 3-digit hex and ignores an alpha channel', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF80', '#000000')).toBeCloseTo(21, 1);
  });
});

describe('palette', () => {
  const surfaces = ['canvas', 'surface', 'raised'] as const;

  it.each(surfaces)('primary text is readable on %s (AA, 4.5:1)', (name) => {
    expect(
      contrastRatio(palette.textPrimary, palette[name]),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each(surfaces)('secondary text is readable on %s (AA, 4.5:1)', (name) => {
    expect(
      contrastRatio(palette.textSecondary, palette[name]),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each(surfaces)('the accents are visible on %s (3:1)', (name) => {
    for (const accent of [
      palette.primary,
      palette.blocked,
      palette.danger,
      palette.warning,
    ]) {
      expect(contrastRatio(accent, palette[name])).toBeGreaterThanOrEqual(3);
    }
  });

  it('text on a filled accent button is readable (AA)', () => {
    expect(
      contrastRatio(palette.onPrimary, palette.primary),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(palette.onBlocked, palette.blocked),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(palette.onDanger, palette.danger),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps disabled text clearly dimmer than secondary text', () => {
    expect(contrastRatio(palette.textDisabled, palette.canvas)).toBeLessThan(
      contrastRatio(palette.textSecondary, palette.canvas),
    );
  });
});

describe('scales', () => {
  it('spacing is on a 4-point grid and ascending', () => {
    const values = Object.values(space);
    expect(values.every((v) => v % 4 === 0)).toBe(true);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it('radii ascend, with a pill that is larger than any other', () => {
    const { pill, ...rest } = radius;
    const values = Object.values(rest);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(pill).toBeGreaterThan(Math.max(...values));
  });

  it('the type scale never goes below 12 and headings are heavier than body', () => {
    for (const style of Object.values(typography)) {
      expect(style.fontSize).toBeGreaterThanOrEqual(12);
    }
    expect(Number(typography.display.fontWeight)).toBeGreaterThan(
      Number(typography.body.fontWeight),
    );
  });
});
