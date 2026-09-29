import { IOnlineQuotesRepository } from '../../data/repositories/i-online-quotes-repository';
import { logger } from '../../core/utils/logger';
import { RemoteQuote, sanitizeRemoteQuotes } from '../quotes/quote-validation';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CACHED = 200;

export type RefreshResult =
  | 'disabled'
  | 'not_due'
  | 'refreshed'
  | 'nothing_new'
  | 'failed';

/**
 * The optional "fresh quotes from the internet" feature. Off by default; when on it fetches at
 * most once a day, keeps only quotes that pass sanitizeRemoteQuotes, and never lets a failure
 * (offline, rate limited, junk) reach the user: the bundled quotes always remain.
 */
export class ManageOnlineQuotesUseCase {
  constructor(
    private readonly repository: IOnlineQuotesRepository,
    private readonly clock: () => number = Date.now,
  ) {}

  isEnabled(): Promise<boolean> {
    return this.repository.isEnabled();
  }

  /** Turning it off forgets every online quote and resets the schedule. */
  async setEnabled(enabled: boolean): Promise<void> {
    await this.repository.setEnabled(enabled);
    if (!enabled) {
      await this.repository.saveCached([]);
      await this.repository.pushToNative([]);
      await this.repository.setLastAttemptAt(0);
    }
  }

  async refreshIfDue(): Promise<RefreshResult> {
    if (!(await this.repository.isEnabled())) {
      return 'disabled';
    }
    const now = this.clock();
    const lastAttempt = await this.repository.getLastAttemptAt();
    if (lastAttempt !== null && now - lastAttempt < DAY_MS) {
      return 'not_due';
    }

    // Recorded before fetching, so a failing service is retried tomorrow, not on every launch.
    await this.repository.setLastAttemptAt(now);
    try {
      const cached = await this.repository.getCached();
      const fresh = sanitizeRemoteQuotes(
        await this.repository.fetchBatch(),
        cached.map((quote) => quote.text),
      );
      if (fresh.length === 0) {
        return 'nothing_new';
      }
      const merged: RemoteQuote[] = [...cached, ...fresh].slice(-MAX_CACHED);
      await this.repository.saveCached(merged);
      await this.repository.pushToNative(merged);
      return 'refreshed';
    } catch (error) {
      logger.warn('[OnlineQuotes] Could not refresh quotes', error);
      return 'failed';
    }
  }
}
