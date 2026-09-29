import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { MonitorStatus } from '@core/types/native.types';
import UsageTracker from '@services/tracker/usage-tracker-service';

const native = NativeModules.MonitorConfigModule;

const status = (overrides: Partial<MonitorStatus> = {}): MonitorStatus => ({
  enabled: false,
  running: false,
  lastHeartbeatAt: null,
  lastStopReason: null,
  health: [],
  ...overrides,
});

describe('UsageTracker', () => {
  let request: jest.SpyInstance;

  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
    request = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  });

  afterEach(() => {
    request.mockRestore();
    jest.restoreAllMocks();
  });

  describe('start', () => {
    it('turns monitoring on once notifications are allowed', async () => {
      await UsageTracker.start();

      expect(native.setMonitoringEnabled).toHaveBeenCalledWith(true);
    });

    it('asks for the notification permission first on Android 13 and newer', async () => {
      await UsageTracker.start();

      expect(request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
    });

    it('does not ask on older Android versions', async () => {
      jest.spyOn(Platform, 'Version', 'get').mockReturnValue(31);

      await UsageTracker.start();

      expect(request).not.toHaveBeenCalled();
      expect(native.setMonitoringEnabled).toHaveBeenCalledWith(true);
    });

    it('refuses, without turning anything on, when notifications are denied', async () => {
      request.mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

      await expect(UsageTracker.start()).rejects.toThrow(
        'Notification permission is required',
      );
      expect(native.setMonitoringEnabled).not.toHaveBeenCalled();
    });

    it('does nothing off Android', async () => {
      jest.replaceProperty(Platform, 'OS', 'ios');

      await UsageTracker.start();

      expect(native.setMonitoringEnabled).not.toHaveBeenCalled();
    });

    it('passes on a failure to start the service', async () => {
      native.setMonitoringEnabled.mockRejectedValueOnce(
        Object.assign(new Error('cannot start'), { code: 'MONITOR_ERROR' }),
      );

      await expect(UsageTracker.start()).rejects.toMatchObject({
        code: 'MONITOR_ERROR',
      });
    });
  });

  describe('stop', () => {
    it('turns monitoring off', async () => {
      await UsageTracker.stop();

      expect(native.setMonitoringEnabled).toHaveBeenCalledWith(false);
    });
  });

  describe('resumeIfInterrupted', () => {
    it('restarts the service when the user wants monitoring but it is not running', async () => {
      native.getMonitorStatus.mockResolvedValueOnce(
        status({ enabled: true, running: true }),
      );

      const result = await UsageTracker.resumeIfInterrupted(
        status({ enabled: true, running: false }),
      );

      expect(native.setMonitoringEnabled).toHaveBeenCalledWith(true);
      expect(result).toMatchObject({ enabled: true, running: true });
    });

    it('leaves a running service alone', async () => {
      const running = status({ enabled: true, running: true });

      const result = await UsageTracker.resumeIfInterrupted(running);

      expect(native.setMonitoringEnabled).not.toHaveBeenCalled();
      expect(result).toBe(running);
    });

    it('does not start anything the user turned off', async () => {
      const off = status({ enabled: false, running: false });

      const result = await UsageTracker.resumeIfInterrupted(off);

      expect(native.setMonitoringEnabled).not.toHaveBeenCalled();
      expect(result).toBe(off);
    });

    it('keeps the intent when the restart fails, and returns the status it had', async () => {
      const interrupted = status({ enabled: true, running: false });
      native.setMonitoringEnabled.mockRejectedValueOnce(new Error('nope'));

      const result = await UsageTracker.resumeIfInterrupted(interrupted);

      expect(result).toBe(interrupted);
    });
  });
});
