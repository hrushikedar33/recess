import fs from 'fs';
import path from 'path';
import { palette } from '@shared/theme/tokens';

/** The native surfaces (cover window, notification) must use exactly the app's colours. */
const MAPPING: Record<string, keyof typeof palette> = {
  recess_canvas: 'canvas',
  recess_surface: 'surface',
  recess_raised: 'raised',
  recess_border: 'border',
  recess_text_primary: 'textPrimary',
  recess_text_secondary: 'textSecondary',
  recess_primary: 'primary',
  recess_on_primary: 'onPrimary',
  recess_blocked: 'blocked',
  recess_on_blocked: 'onBlocked',
  recess_danger: 'danger',
};

const xml = fs.readFileSync(
  path.join(__dirname, '../../../android/app/src/main/res/values/colors.xml'),
  'utf8',
);

const nativeColors: Record<string, string> = {};
for (const match of xml.matchAll(/<color name="(\w+)">(#[0-9A-Fa-f]{6,8})<\/color>/g)) {
  nativeColors[match[1]] = match[2].toUpperCase();
}

describe('native colours mirror the design tokens', () => {
  it.each(Object.entries(MAPPING))('%s matches palette.%s', (name, token) => {
    expect(nativeColors[name]).toBe(palette[token].toUpperCase());
  });

  it('has no recess_* colour that this test does not know about', () => {
    const unknown = Object.keys(nativeColors).filter(
      (name) => name.startsWith('recess_') && !(name in MAPPING),
    );

    expect(unknown).toEqual([]);
  });
});
