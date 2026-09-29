import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';
import { NativeModules } from 'react-native';
import { BLOCKED_APPS_STORAGE_KEY } from '@core/constants/storage.keys';
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
    const execute = jest
      .spyOn(useCases.syncBlockedApps, 'execute')
      .mockResolvedValue(undefined);

    const { rerender } = renderHook(() => useStartupSync());
    rerender({});
    rerender({});

    expect(execute).toHaveBeenCalledTimes(1);
    execute.mockRestore();
  });

  it('does not crash the app when native is unavailable', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    native.syncBlockedApps.mockRejectedValueOnce(new Error('native down'));

    const { result } = renderHook(() => useStartupSync());

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
    warn.mockRestore();
  });
});
