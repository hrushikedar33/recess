import { copy } from '@shared/copy';

type Leaf = string | ((...args: string[]) => string);

/** Every string in the copy tree, with parameterised ones filled in using recognisable samples. */
function collect(node: unknown, path: string[] = []): [string, string][] {
  if (typeof node === 'string') {
    return [[path.join('.'), node]];
  }
  if (typeof node === 'function') {
    return [
      [
        path.join('.'),
        (node as Leaf as (...a: string[]) => string)('A', 'B', 'C'),
      ],
    ];
  }
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, value]) =>
      collect(value, [...path, key]),
    );
  }
  return [];
}

// Words that belong in headlines and empty states, never in an instruction or an error.
const SLANG =
  /\b(no cap|fr fr|bestie|touch grass|locked in|slay|lowkey|highkey|rizz|bruh|ngl|vibes?|sesh|on blast|off the grid|bet)\b/i;

describe('copy', () => {
  const all = collect(copy);

  it('has strings', () => {
    expect(all.length).toBeGreaterThan(0);
  });

  it.each(all)('%s is not empty', (_path, text) => {
    expect(text.trim().length).toBeGreaterThan(0);
  });

  it.each(all)(
    '%s has no leftover placeholder or "undefined"',
    (_path, text) => {
      expect(text).not.toMatch(/\{[a-zA-Z0-9_]*\}|undefined|null|NaN/);
    },
  );

  it.each(all.filter(([path]) => path.split('.').includes('plain')))(
    '%s (instructions, permissions and errors) stays plain, no slang',
    (_path, text) => {
      expect(text).not.toMatch(SLANG);
    },
  );

  it('the slang detector actually detects slang (guards the guard)', () => {
    expect('Time to touch grass, bestie').toMatch(SLANG);
    expect('Open Settings, then Battery').not.toMatch(SLANG);
  });
});
