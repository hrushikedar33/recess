import { AppError } from '../../core/errors/app-error';

export const QUOTES_API_URL = 'https://zenquotes.io/api/quotes';

/**
 * Fetches one batch of quotes. The body is returned as-is and untrusted: judging it is the job of
 * sanitizeRemoteQuotes. Every failure (no network, HTTP error, timeout, bad JSON) becomes an
 * AppError so callers never deal with raw errors.
 */
export async function fetchQuoteBatch(
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 8000,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(QUOTES_API_URL, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new AppError(
        'QUOTES_HTTP',
        `The quotes service answered ${response.status}.`,
      );
    }
    return await response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'QUOTES_UNAVAILABLE',
      'Could not reach the quotes service.',
    );
  } finally {
    clearTimeout(timer);
  }
}
