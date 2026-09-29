import {
  ONLINE_QUOTES_ATTEMPT_STORAGE_KEY,
  ONLINE_QUOTES_CACHE_STORAGE_KEY,
  ONLINE_QUOTES_ENABLED_STORAGE_KEY,
} from '../../core/constants/storage.keys';
import { RemoteQuote } from '../../domain/quotes/quote-validation';
import { MonitorAdapter } from '../local/native/monitor-adapter';
import { AsyncStorageAdapter } from '../local/storage/async-storage-adapter';
import { fetchQuoteBatch } from '../remote/quotes-api-client';
import { IOnlineQuotesRepository } from './i-online-quotes-repository';

const isRemoteQuote = (value: unknown): value is RemoteQuote =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RemoteQuote).text === 'string' &&
  typeof (value as RemoteQuote).author === 'string';

export class OnlineQuotesRepository implements IOnlineQuotesRepository {
  async isEnabled(): Promise<boolean> {
    return (
      (await AsyncStorageAdapter.getItem(ONLINE_QUOTES_ENABLED_STORAGE_KEY)) ===
      'true'
    );
  }

  setEnabled(enabled: boolean): Promise<void> {
    return AsyncStorageAdapter.setItem(
      ONLINE_QUOTES_ENABLED_STORAGE_KEY,
      String(enabled),
    );
  }

  async getLastAttemptAt(): Promise<number | null> {
    const raw = await AsyncStorageAdapter.getItem(
      ONLINE_QUOTES_ATTEMPT_STORAGE_KEY,
    );
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  }

  setLastAttemptAt(timestampMs: number): Promise<void> {
    return AsyncStorageAdapter.setItem(
      ONLINE_QUOTES_ATTEMPT_STORAGE_KEY,
      String(timestampMs),
    );
  }

  /** Unreadable data reads as "nothing cached"; entries that are not quotes are dropped. */
  async getCached(): Promise<RemoteQuote[]> {
    try {
      const raw = await AsyncStorageAdapter.getItem(
        ONLINE_QUOTES_CACHE_STORAGE_KEY,
      );
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isRemoteQuote) : [];
    } catch {
      return [];
    }
  }

  saveCached(quotes: RemoteQuote[]): Promise<void> {
    return AsyncStorageAdapter.setItem(
      ONLINE_QUOTES_CACHE_STORAGE_KEY,
      JSON.stringify(quotes),
    );
  }

  fetchBatch(): Promise<unknown> {
    return fetchQuoteBatch();
  }

  pushToNative(quotes: RemoteQuote[]): Promise<void> {
    return MonitorAdapter.syncExtraQuotes(quotes);
  }
}
