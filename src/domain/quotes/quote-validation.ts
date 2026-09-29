export interface RemoteQuote {
  text: string;
  author: string;
}

const MIN_TEXT = 10;
const MAX_TEXT = 220;
const MAX_AUTHOR = 40;
const MAX_PER_BATCH = 50;

/*
 * An ALLOWLIST, not a list of known-bad things: the text comes from a website and ends up in a
 * notification and a full-screen screen, so anything that is not plainly a sentence is refused.
 * Latin letters (with accents), spaces and ordinary punctuation only. No digits (which is how
 * phone numbers get in), no symbols or slashes (links, amounts), no emoji, no other scripts, and
 * none of the invisible or direction-changing characters used to spoof text. Explicit ranges are
 * used rather than Unicode property escapes so nothing depends on the JS engine supporting them.
 * The native side (QuotePool.kt) applies the same rules again and must stay identical; both are
 * tested against __tests__/fixtures/quote-validation-cases.json.
 */
const LETTERS = 'A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F';
const TEXT_ALLOWED = new RegExp(
  `^[${LETTERS} '\\u2018\\u2019"\\u201C\\u201D(),.;:!?\\-\\u2013\\u2014\\u2026]+$`,
);
const AUTHOR_ALLOWED = new RegExp(`^[${LETTERS} .'\\u2019\\-]+$`);
const SENTENCE_END = /[.?!’”]$/;
// A dot straight between letters looks like a web address ("example.com").
const WEB_ADDRESS = /[A-Za-z]\.[A-Za-z]{2,}/;
// The service answers with a fake "quote" when it is rate limiting; it must never reach a notification.
const RATE_LIMIT_TEXT = /too many requests|auth key|unlimited access/i;
const SERVICE_AUTHOR = /zenquotes|\.io|\.com/i;
const UNATTRIBUTED = ['unknown', 'anonymous', 'anon'];

const normalize = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]/g, '');

const toCandidate = (entry: unknown): RemoteQuote | null => {
  if (typeof entry !== 'object' || entry === null) {
    return null;
  }
  const { q, a } = entry as Record<string, unknown>;
  if (typeof q !== 'string' || typeof a !== 'string') {
    return null;
  }
  const text = q.trim();
  const author = a.trim();

  const textOk =
    text.length >= MIN_TEXT &&
    text.length <= MAX_TEXT &&
    TEXT_ALLOWED.test(text) &&
    SENTENCE_END.test(text) &&
    !WEB_ADDRESS.test(text) &&
    !RATE_LIMIT_TEXT.test(text);
  const authorOk =
    author.length > 0 &&
    author.length <= MAX_AUTHOR &&
    AUTHOR_ALLOWED.test(author) &&
    !WEB_ADDRESS.test(author) &&
    !SERVICE_AUTHOR.test(author) &&
    !UNATTRIBUTED.includes(author.toLowerCase());

  return textOk && authorOk ? { text, author } : null;
};

/**
 * Turns an untrusted API response into quotes that are safe to show in a notification: only plain,
 * attributed, sentence-length text, never a link, markup, or the service's own error message, and
 * never one already known. At most 50 per batch.
 */
export function sanitizeRemoteQuotes(
  raw: unknown,
  knownTexts: string[],
): RemoteQuote[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set(knownTexts.map(normalize));
  const accepted: RemoteQuote[] = [];
  for (const entry of raw) {
    const candidate = toCandidate(entry);
    if (!candidate) {
      continue;
    }
    const key = normalize(candidate.text);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    accepted.push(candidate);
    if (accepted.length === MAX_PER_BATCH) {
      break;
    }
  }
  return accepted;
}
