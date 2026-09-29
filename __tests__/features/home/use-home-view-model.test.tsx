import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  Alert,
  Linking,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { MonitorStatus } from '@core/types/native.types';
import { useHomeViewModel } from '@features/home/use-home-view-model';

// Run the "on focus" effect once on mount, without a navigation container.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useFocusEffect: (effect: () => void) => useEffect(() => effect(), []),
    useNavigation: () => ({ navigate: jest.fn() }),
  };
});

const monitor = NativeModules.MonitorConfigModule;
const usage = NativeModules.UsageStatsModule;

const status = (overrides: Partial<MonitorStatus> = {}): MonitorStatus => ({
  enabled: false,
  running: false,
  lastHeartbeatAt: null,
  lastStopReason: null,
  health: [],
  ...overrides,
});

const grantEverything = () => {
  usage.hasPermission.mockResolvedValue(true);
  usage.hasOverlayPermission.mockResolvedValue(true);
  usage.isBatteryOptimizationIgnored.mockResolvedValue(true);
};

const renderHome = async () => {
  const hook = renderHook(() => useHomeViewModel());
  await waitFor(() => expect(monitor.getMonitorStatus).toHaveBeenCalled());
  return hook;
};

describe('useHomeViewModel: the monitoring toggle', () => {
  let alert: jest.SpyInstance;

  beforeEach(async () => {
    // clearMocks only clears calls; implementations set by earlier tests would otherwise leak.
    monitor.getMonitorStatus.mockReset().mockResolvedValue(status());
    monitor.setMonitoringEnabled.mockReset().mockResolvedValue(undefined);
    await AsyncStorage.clear();
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    grantEverything();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows ON when the user turned monitoring on, whatever JS remembers', async () => {
    monitor.getMonitorStatus.mockResolvedValue(
      status({ enabled: true, running: true }),
    );

    const { result } = await renderHome();

    await waitFor(() => expect(result.current.trackerEnabled).toBe(true));
  });

  it('shows OFF when the user has not turned monitoring on', async () => {
    const { result } = await renderHome();

    expect(result.current.trackerEnabled).toBe(false);
  });

  it('restarts the service on open when it was meant to be on but is not running', async () => {
    monitor.getMonitorStatus
      .mockResolvedValueOnce(status({ enabled: true, running: false }))
      .mockResolvedValue(status({ enabled: true, running: true }));

    const { result } = await renderHome();

    await waitFor(() =>
      expect(monitor.setMonitoringEnabled).toHaveBeenCalledWith(true),
    );
    await waitFor(() => expect(result.current.trackerEnabled).toBe(true));
    expect(alert).not.toHaveBeenCalled();
  });

  it('leaves a healthy running service alone', async () => {
    monitor.getMonitorStatus.mockResolvedValue(
      status({ enabled: true, running: true }),
    );

    await renderHome();

    expect(monitor.setMonitoringEnabled).not.toHaveBeenCalled();
  });

  it("still shows ON when the restart fails: the intent is the user's, not the process's", async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    monitor.getMonitorStatus.mockResolvedValue(
      status({ enabled: true, running: false }),
    );
    monitor.setMonitoringEnabled.mockRejectedValue(new Error('blocked'));

    const { result } = await renderHome();

    await waitFor(() =>
      expect(monitor.setMonitoringEnabled).toHaveBeenCalled(),
    );
    expect(result.current.trackerEnabled).toBe(true);
    warn.mockRestore();
  });

  it('does not crash when the monitor status cannot be read', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    monitor.getMonitorStatus.mockRejectedValue(new Error('no native'));

    const { result } = await renderHome();

    expect(result.current.trackerEnabled).toBe(false);
    warn.mockRestore();
  });

  it('turns monitoring on when the user taps the toggle and everything is granted', async () => {
    monitor.getMonitorStatus
      .mockResolvedValueOnce(status())
      .mockResolvedValue(status({ enabled: true, running: true }));
    const { result } = await renderHome();
    await waitFor(() =>
      expect(usage.isBatteryOptimizationIgnored).toHaveBeenCalled(),
    );

    await act(async () => {
      await result.current.handleToggleTracker();
    });

    expect(monitor.setMonitoringEnabled).toHaveBeenCalledWith(true);
    expect(result.current.trackerEnabled).toBe(true);
  });

  it('turns monitoring off, and only when the user taps the toggle', async () => {
    monitor.getMonitorStatus
      .mockResolvedValueOnce(status({ enabled: true, running: true }))
      .mockResolvedValue(status());
    const { result } = await renderHome();
    await waitFor(() => expect(result.current.trackerEnabled).toBe(true));
    expect(monitor.setMonitoringEnabled).not.toHaveBeenCalledWith(false);

    await act(async () => {
      await result.current.handleToggleTracker();
    });

    expect(monitor.setMonitoringEnabled).toHaveBeenCalledWith(false);
    expect(result.current.trackerEnabled).toBe(false);
  });

  it('asks for Usage Access instead of turning on when it is missing', async () => {
    usage.hasPermission.mockResolvedValue(false);
    const { result } = await renderHome();
    await waitFor(() => expect(usage.hasPermission).toHaveBeenCalled());

    await act(async () => {
      await result.current.handleToggleTracker();
    });

    expect(alert).toHaveBeenCalledWith(
      'Permission Required',
      expect.stringContaining('Usage Access'),
      expect.any(Array),
    );
    expect(monitor.setMonitoringEnabled).not.toHaveBeenCalledWith(true);
  });

  it('asks for the overlay permission instead of turning on when it is missing', async () => {
    usage.hasOverlayPermission.mockResolvedValue(false);
    const { result } = await renderHome();
    await waitFor(() => expect(usage.hasOverlayPermission).toHaveBeenCalled());

    await act(async () => {
      await result.current.handleToggleTracker();
    });

    expect(alert).toHaveBeenCalledWith(
      'Permission Required',
      expect.stringContaining('Display over other apps'),
      expect.any(Array),
    );
    expect(monitor.setMonitoringEnabled).not.toHaveBeenCalledWith(true);
  });

  it('shows an error and stays OFF when the service cannot be started', async () => {
    monitor.setMonitoringEnabled.mockRejectedValueOnce(
      new Error('cannot start'),
    );
    const { result } = await renderHome();
    await waitFor(() =>
      expect(usage.isBatteryOptimizationIgnored).toHaveBeenCalled(),
    );

    await act(async () => {
      await result.current.handleToggleTracker();
    });

    expect(alert).toHaveBeenCalledWith('Tracker Error', expect.any(String));
    expect(result.current.trackerEnabled).toBe(false);
  });
});

describe('useHomeViewModel: making problems visible', () => {
  beforeEach(async () => {
    monitor.getMonitorStatus.mockReset().mockResolvedValue(status());
    monitor.setMonitoringEnabled.mockReset().mockResolvedValue(undefined);
    await AsyncStorage.clear();
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
    jest.spyOn(Platform, 'constants', 'get').mockReturnValue({
      Manufacturer: 'Google',
    } as never);
    grantEverything();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const running = (overrides: Partial<MonitorStatus> = {}) =>
    monitor.getMonitorStatus.mockResolvedValue(
      status({ enabled: true, running: true, ...overrides }),
    );

  it('explains an interruption once the app is opened again', async () => {
    running({ lastStopReason: 'destroyed_while_enabled' });

    const { result } = await renderHome();

    await waitFor(() =>
      expect(result.current.interruptionNote).toContain(
        'Android stopped Recess',
      ),
    );
  });

  it('does not explain a stop the user asked for', async () => {
    running({ lastStopReason: 'stopped_by_user' });

    const { result } = await renderHome();

    await waitFor(() => expect(result.current.trackerEnabled).toBe(true));
    expect(result.current.interruptionNote).toBeNull();
  });

  it('does not explain an old stop while monitoring is off', async () => {
    monitor.getMonitorStatus.mockResolvedValue(
      status({ enabled: false, lastStopReason: 'task_removed' }),
    );

    const { result } = await renderHome();

    expect(result.current.interruptionNote).toBeNull();
  });

  it('remembers that the note was dismissed, so it does not come back', async () => {
    running({ lastStopReason: 'task_removed' });
    const first = await renderHome();
    await waitFor(() =>
      expect(first.result.current.interruptionNote).not.toBeNull(),
    );

    await act(async () => {
      await first.result.current.handleDismissInterruption();
    });
    expect(first.result.current.interruptionNote).toBeNull();
    first.unmount();

    const second = await renderHome();
    await waitFor(() =>
      expect(second.result.current.trackerEnabled).toBe(true),
    );
    expect(second.result.current.interruptionNote).toBeNull();
  });

  it('shows a new interruption even after an earlier one was dismissed', async () => {
    running({ lastStopReason: 'task_removed' });
    const first = await renderHome();
    await waitFor(() =>
      expect(first.result.current.interruptionNote).not.toBeNull(),
    );
    await act(async () => {
      await first.result.current.handleDismissInterruption();
    });
    first.unmount();

    running({ lastStopReason: 'destroyed_while_enabled' });
    const second = await renderHome();

    await waitFor(() =>
      expect(second.result.current.interruptionNote).not.toBeNull(),
    );
  });

  it("turns the monitor's health report into a warning the user can read", async () => {
    running({ health: ['OVERLAY_MISSING'] });

    const { result } = await renderHome();

    await waitFor(() =>
      expect(result.current.monitorHealth.tone).toBe('warning'),
    );
    expect(result.current.monitorHealth.details[0]).toContain(
      'Display over other apps',
    );
  });

  it('shows the battery guidance on a phone from a maker that needs it', async () => {
    jest.spyOn(Platform, 'constants', 'get').mockReturnValue({
      Manufacturer: 'OnePlus',
    } as never);
    running();

    const { result } = await renderHome();

    await waitFor(() => expect(result.current.oemGuidance).not.toBeNull());
    expect(result.current.oemGuidance?.steps).toMatch(/battery/i);
  });

  it('shows no guidance while monitoring is off, even on a phone that needs it', async () => {
    jest.spyOn(Platform, 'constants', 'get').mockReturnValue({
      Manufacturer: 'OnePlus',
    } as never);

    const { result } = await renderHome();

    expect(result.current.trackerEnabled).toBe(false);
    expect(result.current.oemGuidance).toBeNull();
  });

  it('shows no guidance on a phone that does not need it', async () => {
    running();

    const { result } = await renderHome();

    await waitFor(() => expect(result.current.trackerEnabled).toBe(true));
    expect(result.current.oemGuidance).toBeNull();
  });

  it('remembers that the guidance was dismissed', async () => {
    jest.spyOn(Platform, 'constants', 'get').mockReturnValue({
      Manufacturer: 'OnePlus',
    } as never);
    running();
    const first = await renderHome();
    await waitFor(() =>
      expect(first.result.current.oemGuidance).not.toBeNull(),
    );

    await act(async () => {
      await first.result.current.handleDismissOemGuidance();
    });
    first.unmount();

    const second = await renderHome();
    await waitFor(() =>
      expect(second.result.current.trackerEnabled).toBe(true),
    );
    expect(second.result.current.oemGuidance).toBeNull();
  });

  it("opens the app's own settings page for the guidance", async () => {
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    const { result } = await renderHome();

    act(() => result.current.handleOpenAppSettings());

    expect(openSettings).toHaveBeenCalledTimes(1);
  });
});
