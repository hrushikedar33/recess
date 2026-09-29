import { sanitizeRemoteQuotes } from '@domain/quotes/quote-validation';
import cases from '../../fixtures/quote-validation-cases.json';

/** Letters only, so a fixture can be unique without a digit (digits are not allowed in quotes). */
const letters = (n: number) =>
  String.fromCharCode(97 + Math.floor(n / 26)) +
  String.fromCharCode(97 + (n % 26));

const good = (overrides: Record<string, unknown> = {}) => ({
  q: 'You never know when a moment and a few sincere words can have an impact on a life.',
  a: 'Zig Ziglar',
  c: '82',
  h: '<blockquote>ignored</blockquote>',
  ...overrides,
});

describe('sanitizeRemoteQuotes', () => {
  it('keeps a well-formed quote, using only its text and author', () => {
    expect(sanitizeRemoteQuotes([good()], [])).toEqual([
      {
        text: 'You never know when a moment and a few sincere words can have an impact on a life.',
        author: 'Zig Ziglar',
      },
    ]);
  });

  it('trims the text and the author', () => {
    const [quote] = sanitizeRemoteQuotes(
      [good({ q: '  Begin now.  ', a: '  Seneca ' })],
      [],
    );

    expect(quote).toEqual({ text: 'Begin now.', author: 'Seneca' });
  });

  it.each([
    ['not a list', { q: 'x' }],
    ['null', null],
    ['a string', 'hello'],
  ])('returns nothing when the response is %s', (_name, raw) => {
    expect(sanitizeRemoteQuotes(raw, [])).toEqual([]);
  });

  it('skips entries that are not objects', () => {
    expect(sanitizeRemoteQuotes([42, null, 'x', good()], [])).toHaveLength(1);
  });

  it.each([
    ['a missing text', good({ q: undefined })],
    ['a missing author', good({ a: undefined })],
    ['a text that is not a string', good({ q: 123 })],
    ['a blank author', good({ a: '   ' })],
    ['a very short text', good({ q: 'Hi.' })],
    ['a text over 220 characters', good({ q: `${'word '.repeat(50)}end.` })],
    ['a very long author', good({ a: 'x'.repeat(41) })],
    ['a text with markup', good({ q: 'Be <b>bold</b> today please.' })],
    [
      'a text with a link',
      good({ q: 'Read more at http://example.com today.' }),
    ],
    ['a text with an @ sign', good({ q: 'Follow the quiet path today. @' })],
    [
      'an HTML entity in the text',
      good({ q: 'Be &quot;bold&quot; today, friend.' }),
    ],
    ['a control character', good({ q: 'Be bold\u0000 today, friend.' })],
    [
      'a text that does not end like a sentence',
      good({ q: 'Be bold today, my dear friend' }),
    ],
    ['an unknown author', good({ a: 'Unknown' })],
    ['an anonymous author', good({ a: 'Anonymous' })],
  ])('drops an entry with %s', (_name, entry) => {
    expect(sanitizeRemoteQuotes([entry], [])).toEqual([]);
  });

  it('drops the fake quote the service returns when it is rate limiting', () => {
    const rateLimited = {
      q: 'Too many requests. Obtain an auth key for unlimited access.',
      a: 'zenquotes.io',
      c: '64',
      h: '<blockquote>...</blockquote>',
    };

    expect(sanitizeRemoteQuotes([rateLimited], [])).toEqual([]);
  });

  it('drops rate-limit wording even when it comes with a believable author', () => {
    const entry = good({
      q: 'Too many requests. Obtain an auth key for unlimited access.',
      a: 'Marcus Aurelius',
    });

    expect(sanitizeRemoteQuotes([entry], [])).toEqual([]);
  });

  it('drops a service or website name used as the author, even with a believable quote', () => {
    expect(sanitizeRemoteQuotes([good({ a: 'zenquotes.io' })], [])).toEqual([]);
    expect(sanitizeRemoteQuotes([good({ a: 'quotes.com' })], [])).toEqual([]);
  });

  it('drops a quote already in the bundled or cached set, ignoring case and punctuation', () => {
    const existing = [
      'YOU NEVER KNOW when a moment, and a few sincere words can have an impact on a life',
    ];

    expect(sanitizeRemoteQuotes([good()], existing)).toEqual([]);
  });

  it('drops repeats within one batch', () => {
    expect(sanitizeRemoteQuotes([good(), good()], [])).toHaveLength(1);
  });

  it('accepts at most 50 quotes from one batch', () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      good({ q: `Quote ${letters(i)} is a fine one.` }),
    );

    expect(sanitizeRemoteQuotes(many, [])).toHaveLength(50);
  });

  describe('the character allowlist, which is stricter than a list of known-bad things', () => {
    it.each([
      ['a right-to-left override', 'Be bold today,\u202E dear friend.'],
      ['a zero-width space', 'Be bold\u200B today, dear friend.'],
      ['a zero-width joiner', 'Be bold\u200D today, dear friend.'],
      ['a line separator', 'Be bold today,\u2028 dear friend.'],
      ['a paragraph separator', 'Be bold today,\u2029 dear friend.'],
      ['a next-line control', 'Be bold today,\u0085 dear friend.'],
      ['a byte-order mark', 'Be bold today,\uFEFF dear friend.'],
      ['a non-breaking space', 'Be bold today,\u00A0dear friend.'],
      ['a tab', 'Be bold today,\tdear friend.'],
      ['a newline', 'Be bold today,\ndear friend.'],
      ['a lone surrogate', 'Be bold today,\uD800 dear friend.'],
      ['an emoji', 'Be bold today \uD83D\uDE00 dear friend.'],
      ['a tag character', 'Be bold today,\uDB40\uDC41 dear friend.'],
      [
        'digits, which is how phone numbers get in',
        'Your account is locked. Call 555-0100 now.',
      ],
      ['an upper case link', 'Visit HTTPS://EVIL.X for more today.'],
      ['a bare web address', 'Read the rest at example.com today.'],
      ['a dollar amount', 'Send $100 to be safe, my friend.'],
      ['a slash', 'Be bold today/ dear friend, always.'],
      [
        'text in another script',
        '\u4F60\u597D\u4E16\u754C\u4F60\u597D\u4E16\u754C\u3002',
      ],
    ])('drops a quote with %s', (_name, text) => {
      expect(sanitizeRemoteQuotes([good({ q: text })], [])).toEqual([]);
    });

    it.each([
      ['a right-to-left override', 'Marcus\u202E Aurelius'],
      ['a zero-width space', 'Marcus\u200B Aurelius'],
      ['a digit', 'Author 7'],
      ['an emoji', 'Marcus \uD83D\uDE00'],
      ['a slash', 'A/B Testing'],
    ])('drops an author with %s', (_name, author) => {
      expect(sanitizeRemoteQuotes([good({ a: author })], [])).toEqual([]);
    });

    it.each([
      [
        'accented letters',
        'Il faut cultiver notre jardin, disait Voltaire, mon ami.',
        'Fran\u00E7ois de La Rochefoucauld',
      ],
      [
        'Nordic letters',
        'Livet kan kun forst\u00E5s baglaens, men leves forlaens.',
        'S\u00F8ren Kierkegaard',
      ],
      [
        'smart quotes and dashes',
        '\u201CBe bold\u201D \u2014 they said, \u2018always\u2019 \u2026 be bold.',
        'Jean-Paul Sartre',
      ],
      [
        'an initial with dots',
        'The obstacle is the way, my dear friend.',
        'J. K. Rowling',
      ],
      [
        'an apostrophe in a name',
        'Nothing great was ever done without hope.',
        'Flannery O\u2019Connor',
      ],
    ])('keeps %s', (_name, text, author) => {
      expect(
        sanitizeRemoteQuotes([good({ q: text, a: author })], []),
      ).toHaveLength(1);
    });
  });
});

// The native validator (QuotePool) is tested against this same file and must give the same answers.
describe('the cases shared with the native validator', () => {
  it.each(cases.accept.map((c) => [c.text.slice(0, 40), c]))(
    'accepts %s',
    (_name, c) => {
      expect(sanitizeRemoteQuotes([{ q: c.text, a: c.author }], [])).toEqual([
        { text: c.text, author: c.author },
      ]);
    },
  );

  it.each(cases.reject.map((c) => [c.why, c]))('refuses: %s', (_why, c) => {
    expect(sanitizeRemoteQuotes([{ q: c.text, a: c.author }], [])).toEqual([]);
  });
});
