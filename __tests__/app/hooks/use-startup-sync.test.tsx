import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';
import { NativeModules } from 'react-native';
import {
  BLOCKED_APPS_STORAGE_KEY,
  GOALS_STORAGE_KEY,
} from '@core/constants/storage.keys';
import { useCases } from '@app/di';
import { useStartupSync } from '@app/hooks/use-startup-sync';

const native = NativeModules.MonitorConfigModule;

describe('useStartupSync', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('pushes the stored blocked apps to native once when the app starts', async () => {
    await AsyncStorage.setItem(
      BLOCKED_APPS_STORAGE_KEY,
      JSON.stringify([
        {
          packageName: 'com.instagram.android',
          appName: 'Instagram',
          limitMinutes: 10,
          cooldownMinutes: 5,
          isActive: true,
        },
      ]),
    );

    renderHook(() => useStartupSync());

    await waitFor(() =>
      expect(native.syncBlockedApps).toHaveBeenCalledTimes(1),
    );
    const sent = JSON.parse(native.syncBlockedApps.mock.calls[0][0] as string);
    expect(sent.map((app: { packageName: string }) => app.packageName)).toEqual(
      ['com.instagram.android'],
    );
  });

  it('does not sync again when the component re-renders', () => {
    const syncApps = jest
      .spyOn(useCases.syncBlockedApps, 'execute')
      .mockResolvedValue(undefined);
    const syncGoals = jest
      .spyOn(useCases.syncGoals, 'execute')
      .mockResolvedValue(undefined);
    const refreshQuotes = jest
      .spyOn(useCases.onlineQuotes, 'refreshIfDue')
      .mockResolvedValue('disabled');

    const { rerender } = renderHook(() => useStartupSync());
    rerender({});
    rerender({});

    expect(syncApps).toHaveBeenCalledTimes(1);
    expect(syncGoals).toHaveBeenCalledTimes(1);
    expect(refreshQuotes).toHaveBeenCalledTimes(1);
    syncApps.mockRestore();
    syncGoals.mockRestore();
    refreshQuotes.mockRestore();
  });

  it('also pushes the stored goals to native once when the app starts', async () => {
    await AsyncStorage.setItem(
      GOALS_STORAGE_KEY,
      JSON.stringify([
        { id: 'g1', title: 'Finish the report', done: false, createdAt: 1 },
      ]),
    );

    renderHook(() => useStartupSync());

    await waitFor(() => expect(native.syncGoals).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(native.syncBlockedApps).toHaveBeenCalledTimes(1),
    );
    const sent = JSON.parse(native.syncGoals.mock.calls[0][0] as string);
    expect(sent).toEqual([
      { id: 'g1', title: 'Finish the report', done: false },
    ]);
  });

  it('asks for a quotes refresh once when the app starts', async () => {
    const refresh = jest
      .spyOn(useCases.onlineQuotes, 'refreshIfDue')
      .mockResolvedValue('disabled');

    renderHook(() => useStartupSync());

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    refresh.mockRestore();
  });

  it('never lets a failed quotes refresh crash the app', async () => {
    const refresh = jest
      .spyOn(useCases.onlineQuotes, 'refreshIfDue')
      .mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useStartupSync());

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
    refresh.mockRestore();
  });

  it('does not crash the app when native is unavailable', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    native.syncBlockedApps.mockRejectedValueOnce(new Error('native down'));

    const { result } = renderHook(() => useStartupSync());

    await waitFor(() => expect(warn).toHaveBeenCalled());
    await waitFor(() => expect(native.syncGoals).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
    warn.mockRestore();
  });
});
