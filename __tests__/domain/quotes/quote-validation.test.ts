import { sanitizeRemoteQuotes } from '@domain/quotes/quote-validation';

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
      good({ q: `Quote number ${i} is a fine one.` }),
    );

    expect(sanitizeRemoteQuotes(many, [])).toHaveLength(50);
  });
});
