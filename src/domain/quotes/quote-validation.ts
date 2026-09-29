export interface RemoteQuote {
  text: string;
  author: string;
}

const MIN_TEXT = 10;
const MAX_TEXT = 220;
const MAX_AUTHOR = 40;
const MAX_PER_BATCH = 50;

const FORBIDDEN_TEXT = ['<', '>', '@', 'http', '&#', '&quot;', '&amp;', '&lt;'];
// Matching control characters is the whole point of this check.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;
const SENTENCE_END = /[.?!’”]$/;
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
    SENTENCE_END.test(text) &&
    !CONTROL_CHARACTERS.test(text) &&
    !RATE_LIMIT_TEXT.test(text) &&
    !FORBIDDEN_TEXT.some((token) => text.includes(token));
  const authorOk =
    author.length > 0 &&
    author.length <= MAX_AUTHOR &&
    !CONTROL_CHARACTERS.test(author) &&
    !SERVICE_AUTHOR.test(author) &&
    !UNATTRIBUTED.includes(author.toLowerCase()) &&
    !FORBIDDEN_TEXT.some((token) => author.includes(token));

  return textOk && authorOk ? { text, author } : null;
};

/**
 * Turns an untrusted API response into quotes that are safe to show in a notification: only
 * plain, attributed, sentence-length text, never a link, markup, or the service's own error
 * message, and never one already known. At most 50 per batch.
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
