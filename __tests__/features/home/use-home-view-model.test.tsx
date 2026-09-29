import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  Alert,
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
