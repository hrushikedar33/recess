import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { OnlineQuotesRepository } from '@data/repositories/online-quotes-repository';

const native = NativeModules.MonitorConfigModule;

describe('OnlineQuotesRepository', () => {
  let repository: OnlineQuotesRepository;

  beforeEach(async () => {
    await AsyncStorage.clear();
    repository = new OnlineQuotesRepository();
  });

  it('is off until the user turns it on', async () => {
    await expect(repository.isEnabled()).resolves.toBe(false);
  });

  it('remembers the choice across a restart', async () => {
    await repository.setEnabled(true);

    await expect(new OnlineQuotesRepository().isEnabled()).resolves.toBe(true);
  });

  it('remembers turning it back off', async () => {
    await repository.setEnabled(true);
    await repository.setEnabled(false);

    await expect(new OnlineQuotesRepository().isEnabled()).resolves.toBe(false);
  });

  it('has never tried until it records an attempt', async () => {
    await expect(repository.getLastAttemptAt()).resolves.toBeNull();
  });

  it('remembers when it last tried', async () => {
    await repository.setLastAttemptAt(1_700_000_000_000);

    await expect(new OnlineQuotesRepository().getLastAttemptAt()).resolves.toBe(
      1_700_000_000_000,
    );
  });

  it('treats an unreadable attempt time as never having tried', async () => {
    await AsyncStorage.setItem(
      '@AppBlocker:onlineQuotesAttemptAt',
      'yesterday',
    );

    await expect(repository.getLastAttemptAt()).resolves.toBeNull();
  });

  it('caches quotes across a restart', async () => {
    await repository.saveCached([
      { text: 'Cached quote stays put.', author: 'Someone' },
    ]);

    await expect(new OnlineQuotesRepository().getCached()).resolves.toEqual([
      { text: 'Cached quote stays put.', author: 'Someone' },
    ]);
  });

  it('has no cached quotes at first', async () => {
    await expect(repository.getCached()).resolves.toEqual([]);
  });

  it('reads a corrupt cache as empty instead of crashing', async () => {
    await AsyncStorage.setItem('@AppBlocker:onlineQuotesCache', '{corrupt');

    await expect(repository.getCached()).resolves.toEqual([]);
  });

  it('drops cached entries that are not quotes', async () => {
    await AsyncStorage.setItem(
      '@AppBlocker:onlineQuotesCache',
      JSON.stringify([
        { text: 'A real quote here.', author: 'A' },
        { text: 5 },
        null,
      ]),
    );

    await expect(repository.getCached()).resolves.toEqual([
      { text: 'A real quote here.', author: 'A' },
    ]);
  });

  it('sends the quotes to native as JSON with only text and author', async () => {
    await repository.pushToNative([
      { text: 'Pushed quote is short.', author: 'Someone' },
    ]);

    expect(native.syncExtraQuotes).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(native.syncExtraQuotes.mock.calls[0][0] as string),
    ).toEqual([{ text: 'Pushed quote is short.', author: 'Someone' }]);
  });

  it('fetches from the quotes service and returns the raw body', async () => {
    const original = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ q: 'x', a: 'y' }],
    }) as never;

    await expect(repository.fetchBatch()).resolves.toEqual([
      { q: 'x', a: 'y' },
    ]);
    global.fetch = original;
  });
});
