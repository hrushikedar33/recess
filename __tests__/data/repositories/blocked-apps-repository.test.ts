import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { BlockedApp } from '@core/types/domain.types';
import { BLOCKED_APPS_STORAGE_KEY } from '@core/constants/storage.keys';
import { BlockedAppsRepository } from '@data/repositories/blocked-apps-repository';

const native = NativeModules.MonitorConfigModule;

const instagram: BlockedApp = {
  packageName: 'com.instagram.android',
  appName: 'Instagram',
  limitMinutes: 10,
  cooldownMinutes: 5,
  isActive: true,
};

const youtube: BlockedApp = {
  packageName: 'com.google.android.youtube',
  appName: 'YouTube',
  limitMinutes: 20,
  cooldownMinutes: 10,
  isActive: true,
};

/** The list JS handed to native on the given call (default: the latest one). */
const syncedList = (call = native.syncBlockedApps.mock.calls.length - 1) =>
  JSON.parse(native.syncBlockedApps.mock.calls[call][0] as string);

const packagesOf = (list: { packageName: string }[]) =>
  list.map((app) => app.packageName);

const storedApps = async (): Promise<BlockedApp[]> =>
  JSON.parse((await AsyncStorage.getItem(BLOCKED_APPS_STORAGE_KEY)) ?? '[]');

describe('BlockedAppsRepository native mirror', () => {
  let repository: BlockedAppsRepository;
  let warn: jest.SpyInstance;

  beforeEach(async () => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await AsyncStorage.clear();
    repository = new BlockedAppsRepository();
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('sends the full list to native once when an app is added', async () => {
    await AsyncStorage.setItem(
      BLOCKED_APPS_STORAGE_KEY,
      JSON.stringify([instagram]),
    );

    await repository.addBlockedApp(youtube);

    expect(native.syncBlockedApps).toHaveBeenCalledTimes(1);
    expect(packagesOf(syncedList())).toEqual([
      'com.instagram.android',
      'com.google.android.youtube',
    ]);
  });

  it('sends the updated list once when an existing app is edited', async () => {
    await repository.addBlockedApp(instagram);
    native.syncBlockedApps.mockClear();

    await repository.addBlockedApp({ ...instagram, limitMinutes: 30 });

    expect(native.syncBlockedApps).toHaveBeenCalledTimes(1);
    expect(syncedList()).toHaveLength(1);
    expect(syncedList()[0].limitMinutes).toBe(30);
  });

  it('sends the flipped state once when an app is toggled', async () => {
    await repository.addBlockedApp(instagram);
    native.syncBlockedApps.mockClear();

    await repository.toggleBlockedApp(instagram.packageName);

    expect(native.syncBlockedApps).toHaveBeenCalledTimes(1);
    expect(syncedList()[0].isActive).toBe(false);
  });

  it('sends the remaining list once when an app is removed', async () => {
    await repository.addBlockedApp(instagram);
    await repository.addBlockedApp(youtube);
    native.syncBlockedApps.mockClear();

    await repository.removeBlockedApp(instagram.packageName);

    expect(native.syncBlockedApps).toHaveBeenCalledTimes(1);
    expect(packagesOf(syncedList())).toEqual(['com.google.android.youtube']);
  });

  it('never sends app icons across the bridge', async () => {
    await repository.addBlockedApp({
      ...instagram,
      iconBase64: 'data:image/png;base64,AAAA',
    });

    expect(syncedList()[0]).not.toHaveProperty('iconBase64');
    expect(native.syncBlockedApps.mock.calls[0][0]).not.toContain('base64');
  });

  it('does not sync when the apps are only read', async () => {
    await repository.getBlockedApps();

    expect(native.syncBlockedApps).not.toHaveBeenCalled();
  });

  it('keeps the change when native rejects the sync', async () => {
    native.syncBlockedApps.mockRejectedValueOnce(new Error('native down'));

    const result = await repository.addBlockedApp(instagram);

    expect(result).toEqual([instagram]);
    expect(await storedApps()).toEqual([instagram]);
    expect(warn).toHaveBeenCalled();
  });

  it('re-sends the stored list on demand even when nothing changed', async () => {
    await AsyncStorage.setItem(
      BLOCKED_APPS_STORAGE_KEY,
      JSON.stringify([instagram, youtube]),
    );

    await repository.syncToNative();

    expect(native.syncBlockedApps).toHaveBeenCalledTimes(1);
    expect(packagesOf(syncedList())).toEqual([
      'com.instagram.android',
      'com.google.android.youtube',
    ]);
  });

  it('sends an empty list when nothing is stored', async () => {
    await repository.syncToNative();

    expect(syncedList()).toEqual([]);
  });

  it('does not throw when the on-demand sync fails', async () => {
    native.syncBlockedApps.mockRejectedValueOnce(new Error('native down'));

    await expect(repository.syncToNative()).resolves.toBeUndefined();
  });
});
