import { RemoteQuote } from '../../domain/quotes/quote-validation';

/** Everything the optional online-quotes feature needs from the outside world. */
export interface IOnlineQuotesRepository {
  isEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
  getLastAttemptAt(): Promise<number | null>;
  setLastAttemptAt(timestampMs: number): Promise<void>;
  getCached(): Promise<RemoteQuote[]>;
  saveCached(quotes: RemoteQuote[]): Promise<void>;
  /** The raw, untrusted response of the quotes service. */
  fetchBatch(): Promise<unknown>;
  /** Hands the quotes to the native monitor, which mixes them into the bundled ones. */
  pushToNative(quotes: RemoteQuote[]): Promise<void>;
}
