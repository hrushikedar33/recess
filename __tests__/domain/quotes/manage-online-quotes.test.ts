import { RemoteQuote } from '@domain/quotes/quote-validation';
import { IOnlineQuotesRepository } from '@data/repositories/i-online-quotes-repository';
import { ManageOnlineQuotesUseCase } from '@domain/usecases/manage-online-quotes-use-case';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

const entry = (n: number) => ({
  q: `Quote number ${n} is a fine and worthwhile one.`,
  a: `Author ${n}`,
});

class FakeRepository implements IOnlineQuotesRepository {
  enabled = true;
  lastAttempt: number | null = null;
  cached: RemoteQuote[] = [];
  pushed: RemoteQuote[][] = [];
  fetches = 0;
  response: unknown = [entry(1), entry(2)];
  failure: Error | null = null;

  async isEnabled() {
    return this.enabled;
  }
  async setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
  async getLastAttemptAt() {
    return this.lastAttempt;
  }
  async setLastAttemptAt(timestampMs: number) {
    this.lastAttempt = timestampMs;
  }
  async getCached() {
    return this.cached;
  }
  async saveCached(quotes: RemoteQuote[]) {
    this.cached = quotes;
  }
  async fetchBatch() {
    this.fetches += 1;
    if (this.failure) {
      throw this.failure;
    }
    return this.response;
  }
  async pushToNative(quotes: RemoteQuote[]) {
    this.pushed.push(quotes);
  }
}

describe('ManageOnlineQuotesUseCase', () => {
  let repository: FakeRepository;
  let useCase: ManageOnlineQuotesUseCase;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    repository = new FakeRepository();
    useCase = new ManageOnlineQuotesUseCase(repository, () => NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('refreshIfDue', () => {
    it('does nothing at all while the feature is off', async () => {
      repository.enabled = false;

      await expect(useCase.refreshIfDue()).resolves.toBe('disabled');
      expect(repository.fetches).toBe(0);
      expect(repository.lastAttempt).toBeNull();
    });

    it('fetches, keeps the valid quotes and hands them to native', async () => {
      await expect(useCase.refreshIfDue()).resolves.toBe('refreshed');

      expect(repository.cached).toHaveLength(2);
      expect(repository.pushed).toEqual([repository.cached]);
    });

    it('remembers when it tried', async () => {
      await useCase.refreshIfDue();

      expect(repository.lastAttempt).toBe(NOW);
    });

    it('does not fetch again within a day', async () => {
      repository.lastAttempt = NOW - DAY + 1000;

      await expect(useCase.refreshIfDue()).resolves.toBe('not_due');
      expect(repository.fetches).toBe(0);
    });

    it('fetches again once a day has passed', async () => {
      repository.lastAttempt = NOW - DAY;

      await expect(useCase.refreshIfDue()).resolves.toBe('refreshed');
    });

    it('counts a failed attempt as an attempt, so a broken service is not hammered', async () => {
      repository.failure = new Error('offline');
      await expect(useCase.refreshIfDue()).resolves.toBe('failed');
      expect(repository.lastAttempt).toBe(NOW);

      repository.failure = null;
      await expect(useCase.refreshIfDue()).resolves.toBe('not_due');
    });

    it('leaves everything as it was when the fetch fails', async () => {
      repository.cached = [
        { text: 'Kept quote that stays around.', author: 'Someone' },
      ];
      repository.failure = new Error('offline');

      await useCase.refreshIfDue();

      expect(repository.cached).toHaveLength(1);
      expect(repository.pushed).toEqual([]);
    });

    it('adds new quotes to the ones already cached, without repeating any', async () => {
      repository.cached = [
        { text: entry(1).q, author: 'Author 1' },
        { text: 'Older quote kept from last time.', author: 'Old Author' },
      ];

      await useCase.refreshIfDue();

      expect(repository.cached.map((q) => q.text)).toEqual([
        entry(1).q,
        'Older quote kept from last time.',
        entry(2).q,
      ]);
    });

    it('keeps only the newest 200 quotes', async () => {
      repository.cached = Array.from({ length: 199 }, (_, i) => ({
        text: `Cached quote ${i} is here to stay.`,
        author: 'Cached',
      }));
      repository.response = [entry(1), entry(2), entry(3)];

      await useCase.refreshIfDue();

      expect(repository.cached).toHaveLength(200);
      expect(repository.cached[199].text).toBe(entry(3).q);
      expect(repository.cached[0].text).toBe('Cached quote 2 is here to stay.');
    });

    it('does not bother native when nothing new came back', async () => {
      repository.response = [
        { q: 'Too many requests. Obtain an auth key.', a: 'zenquotes.io' },
      ];

      await expect(useCase.refreshIfDue()).resolves.toBe('nothing_new');
      expect(repository.pushed).toEqual([]);
    });

    it('ignores a response that is not a list', async () => {
      repository.response = { error: 'nope' };

      await expect(useCase.refreshIfDue()).resolves.toBe('nothing_new');
    });
  });

  describe('setEnabled', () => {
    it('turning it on records the choice', async () => {
      repository.enabled = false;

      await useCase.setEnabled(true);

      expect(repository.enabled).toBe(true);
    });

    it('turning it off forgets every online quote, here and in native', async () => {
      repository.cached = [
        { text: 'Cached quote to be forgotten.', author: 'Someone' },
      ];

      await useCase.setEnabled(false);

      expect(repository.enabled).toBe(false);
      expect(repository.cached).toEqual([]);
      expect(repository.pushed).toEqual([[]]);
    });

    it('turning it off also resets the schedule, so turning it on fetches straight away', async () => {
      repository.lastAttempt = NOW;

      await useCase.setEnabled(false);
      await useCase.setEnabled(true);

      await expect(useCase.refreshIfDue()).resolves.toBe('refreshed');
    });
  });

  it('reports whether the feature is on', async () => {
    repository.enabled = false;

    await expect(useCase.isEnabled()).resolves.toBe(false);
  });
});
