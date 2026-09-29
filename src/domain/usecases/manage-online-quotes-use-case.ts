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
 *
 * Switching it off is final. Changes go through one queue so writes never interleave, and each
 * switch bumps an "epoch" so a fetch that was already in flight (it can take seconds) discards its
 * result instead of putting quotes back after the user turned the feature off.
 */
export class ManageOnlineQuotesUseCase {
  private epoch = 0;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly repository: IOnlineQuotesRepository,
    private readonly clock: () => number = Date.now,
  ) {}

  isEnabled(): Promise<boolean> {
    return this.repository.isEnabled();
  }

  async setEnabled(enabled: boolean): Promise<void> {
    // Immediately, before waiting in the queue, so a fetch in flight is already known to be stale.
    this.epoch += 1;
    await this.serialize(async () => {
      await this.repository.setEnabled(enabled);
      if (!enabled) {
        await this.clearOnlineQuotes();
      }
    });
  }

  async refreshIfDue(): Promise<RefreshResult> {
    try {
      const plan = await this.serialize(() => this.planRefresh());
      if (plan.kind === 'skip') {
        return plan.result;
      }
      // The slow part happens outside the queue, so switching the feature off never has to wait for it.
      const raw = await this.repository.fetchBatch();
      return await this.serialize(() => this.commit(raw, plan.epoch));
    } catch (error) {
      logger.warn('[OnlineQuotes] Could not refresh quotes', error);
      return 'failed';
    }
  }

  private async planRefresh(): Promise<
    { kind: 'skip'; result: RefreshResult } | { kind: 'fetch'; epoch: number }
  > {
    if (!(await this.repository.isEnabled())) {
      // Finishes a switch-off that was interrupted (the app was closed part-way through).
      if ((await this.repository.getCached()).length > 0) {
        await this.clearOnlineQuotes();
      }
      return { kind: 'skip', result: 'disabled' };
    }
    const now = this.clock();
    const lastAttempt = await this.repository.getLastAttemptAt();
    if (lastAttempt !== null && now - lastAttempt < DAY_MS) {
      return { kind: 'skip', result: 'not_due' };
    }
    // Recorded before fetching, so a failing service is retried tomorrow, not on every launch.
    await this.repository.setLastAttemptAt(now);
    return { kind: 'fetch', epoch: this.epoch };
  }

  private async commit(raw: unknown, epoch: number): Promise<RefreshResult> {
    if (epoch !== this.epoch || !(await this.repository.isEnabled())) {
      return 'disabled';
    }
    const cached = await this.repository.getCached();
    const fresh = sanitizeRemoteQuotes(
      raw,
      cached.map((quote) => quote.text),
    );
    if (fresh.length === 0) {
      return 'nothing_new';
    }
    const merged: RemoteQuote[] = [...cached, ...fresh].slice(-MAX_CACHED);
    await this.repository.saveCached(merged);
    await this.repository.pushToNative(merged);
    return 'refreshed';
  }

  /**
   * Native first, then the cache. If the app is closed in between, the cache still shows there is
   * something left to clear, and the next start finishes the job.
   */
  private async clearOnlineQuotes(): Promise<void> {
    await this.repository.pushToNative([]);
    await this.repository.saveCached([]);
    await this.repository.setLastAttemptAt(0);
  }

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.queue.then(operation, operation);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
