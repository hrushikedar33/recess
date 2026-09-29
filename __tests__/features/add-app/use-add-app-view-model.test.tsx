import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { NativeModules } from 'react-native';
import { BLOCKED_APPS_STORAGE_KEY } from '@core/constants/storage.keys';
import { AppInfo, BlockedApp } from '@core/types/domain.types';
import { useAddAppViewModel } from '@features/add-app/use-add-app-view-model';

const mockNavigation = { goBack: jest.fn() };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

const instagram: AppInfo = {
  packageName: 'com.instagram.android',
  appName: 'Instagram',
};

const renderAddApp = async () => {
  const hook = renderHook(() => useAddAppViewModel());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  act(() => hook.result.current.setSelectedApp(instagram));
  return hook;
};

const stored = async (): Promise<BlockedApp[]> =>
  JSON.parse((await AsyncStorage.getItem(BLOCKED_APPS_STORAGE_KEY)) ?? '[]');

describe('useAddAppViewModel: limits', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockNavigation.goBack.mockReset();
  });

  it('starts with a 10 minute session, a 10 minute cooldown and a 60 minute daily budget', async () => {
    const { result } = await renderAddApp();

    expect(result.current.limitMinutes).toBe(10);
    expect(result.current.cooldownMinutes).toBe(10);
    expect(result.current.dailyLimitMinutes).toBe(60);
  });

  it('offers daily budgets from 15 minutes up, and none at all', async () => {
    const { result } = await renderAddApp();

    expect(result.current.presetDailyLimits).toEqual([
      15, 30, 60, 90, 120, 180,
    ]);
  });

  it('saves all three limits and goes back', async () => {
    const { result } = await renderAddApp();
    act(() => result.current.setLimitMinutes(15));
    act(() => result.current.setCooldownMinutes(30));
    act(() => result.current.setDailyLimitMinutes(90));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(await stored()).toEqual([
      expect.objectContaining({
        packageName: 'com.instagram.android',
        limitMinutes: 15,
        cooldownMinutes: 30,
        dailyLimitMinutes: 90,
        isActive: true,
      }),
    ]);
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('saves a rule without a daily budget when the user chooses no cap', async () => {
    const { result } = await renderAddApp();
    act(() => result.current.setDailyLimitMinutes(null));

    await act(async () => {
      await result.current.handleSave();
    });

    const [rule] = await stored();
    expect(rule).not.toHaveProperty('dailyLimitMinutes');
  });

  it('refuses to save when the daily budget is shorter than one session, and says why', async () => {
    const { result } = await renderAddApp();
    act(() => result.current.setLimitMinutes(60));
    act(() => result.current.setDailyLimitMinutes(30));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.error).toBe(
      'The daily budget must be at least as long as one session.',
    );
    expect(result.current.canSave).toBe(false);
    expect(await stored()).toEqual([]);
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });

  it('shows the problem as soon as the values disagree, before saving', async () => {
    const { result } = await renderAddApp();

    act(() => result.current.setLimitMinutes(60));
    act(() => result.current.setDailyLimitMinutes(30));

    expect(result.current.error).not.toBeNull();
  });

  it('clears the problem once the user fixes it', async () => {
    const { result } = await renderAddApp();
    act(() => result.current.setLimitMinutes(60));
    act(() => result.current.setDailyLimitMinutes(30));

    act(() => result.current.setDailyLimitMinutes(120));

    expect(result.current.error).toBeNull();
    expect(result.current.canSave).toBe(true);
  });

  it('sends the daily budget to native along with the rule', async () => {
    const { result } = await renderAddApp();

    await act(async () => {
      await result.current.handleSave();
    });

    const sent = JSON.parse(
      NativeModules.MonitorConfigModule.syncBlockedApps.mock
        .calls[0][0] as string,
    );
    expect(sent[0].dailyLimitMinutes).toBe(60);
  });
});
