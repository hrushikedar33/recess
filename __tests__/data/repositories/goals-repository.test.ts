import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { GOALS_STORAGE_KEY } from '@core/constants/storage.keys';
import { Goal } from '@core/types/domain.types';
import { GoalsRepository } from '@data/repositories/goals-repository';

const native = NativeModules.MonitorConfigModule;

const goal = (id: string, done = false): Goal => ({
  id,
  title: `Goal ${id}`,
  done,
  createdAt: 42,
});

const syncedList = (call = native.syncGoals.mock.calls.length - 1) =>
  JSON.parse(native.syncGoals.mock.calls[call][0] as string);

describe('GoalsRepository', () => {
  let repository: GoalsRepository;
  let warn: jest.SpyInstance;

  beforeEach(async () => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await AsyncStorage.clear();
    repository = new GoalsRepository();
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('returns no goals when nothing is stored', async () => {
    await expect(repository.getGoals()).resolves.toEqual([]);
  });

  it('returns saved goals after a fresh repository is created', async () => {
    await repository.saveGoals([goal('a'), goal('b', true)]);

    const reopened = new GoalsRepository();

    await expect(reopened.getGoals()).resolves.toEqual([
      goal('a'),
      goal('b', true),
    ]);
  });

  it('treats corrupt stored data as no goals instead of crashing', async () => {
    await AsyncStorage.setItem(GOALS_STORAGE_KEY, '{corrupt');

    await expect(repository.getGoals()).resolves.toEqual([]);
  });

  it('treats stored data that is not a list as no goals', async () => {
    await AsyncStorage.setItem(GOALS_STORAGE_KEY, '{"goals":[]}');

    await expect(repository.getGoals()).resolves.toEqual([]);
  });

  it('drops stored entries that are not goals and keeps the valid ones', async () => {
    await AsyncStorage.setItem(
      GOALS_STORAGE_KEY,
      JSON.stringify([goal('a'), { id: 5 }, null, 'text', goal('b')]),
    );

    const goals = await repository.getGoals();

    expect(goals.map((g) => g.id)).toEqual(['a', 'b']);
  });

  it('sends the full list to native once per save', async () => {
    await repository.saveGoals([goal('a'), goal('b')]);

    expect(native.syncGoals).toHaveBeenCalledTimes(1);
    expect(syncedList().map((g: { id: string }) => g.id)).toEqual(['a', 'b']);
  });

  it('sends only id, title and done to native', async () => {
    await repository.saveGoals([goal('a')]);

    expect(syncedList()[0]).toEqual({ id: 'a', title: 'Goal a', done: false });
  });

  it('sends at most 20 goals to native', async () => {
    const many = Array.from({ length: 25 }, (_, i) => goal(`g${i}`));

    await repository.saveGoals(many);

    expect(syncedList()).toHaveLength(20);
  });

  it('does not sync when goals are only read', async () => {
    await repository.getGoals();

    expect(native.syncGoals).not.toHaveBeenCalled();
  });

  it('keeps the goals when native rejects the sync, and logs it', async () => {
    native.syncGoals.mockRejectedValueOnce(new Error('native down'));

    await repository.saveGoals([goal('a')]);

    await expect(repository.getGoals()).resolves.toEqual([goal('a')]);
    expect(warn).toHaveBeenCalled();
  });

  it('re-sends the stored goals on demand even when nothing changed', async () => {
    await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify([goal('a')]));

    await repository.syncToNative();

    expect(native.syncGoals).toHaveBeenCalledTimes(1);
    expect(syncedList()).toHaveLength(1);
  });

  it('sends an empty list when nothing is stored', async () => {
    await repository.syncToNative();

    expect(syncedList()).toEqual([]);
  });

  it('does not throw when the on-demand sync fails', async () => {
    native.syncGoals.mockRejectedValueOnce(new Error('native down'));

    await expect(repository.syncToNative()).resolves.toBeUndefined();
  });

  it('does not push anything when the stored goals are corrupt, so native keeps the ones it has', async () => {
    await AsyncStorage.setItem(GOALS_STORAGE_KEY, '{corrupt');

    await repository.syncToNative();

    expect(native.syncGoals).not.toHaveBeenCalled();
  });

  it('does not push anything when reading storage fails outright', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('io'));

    await repository.syncToNative();

    expect(native.syncGoals).not.toHaveBeenCalled();
  });
});
