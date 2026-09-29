import { PermissionsAndroid, Platform } from 'react-native';
import { MonitorStatus } from '../../core/types/native.types';
import { logger } from '../../core/utils/logger';
import { MonitorAdapter } from '../../data/local/native/monitor-adapter';
import PermissionsService from '../permissions/permissions-service';

/**
 * JS-side handle on the native monitor. The monitor itself (polling, limits, ejecting,
 * notifying) runs in a native foreground service; this only records the user's intent and asks
 * about the result.
 */
const UsageTracker = {
  /**
   * Records the intent to monitor and starts the service. Throws only if the service cannot be
   * started, never for a missing optional permission.
   */
  start: async (): Promise<void> => {
    if (Platform.OS !== 'android') {
      logger.info('[UsageTracker] Monitoring is only supported on Android');
      return;
    }
    if (Platform.Version >= 33) {
      // Asked for, never required. Without it the block still works and only the alert is lost;
      // the health card says so. Refusing to start here would leave the toggle stuck OFF for anyone
      // who chose "don't ask again".
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      } catch (error) {
        logger.warn('[UsageTracker] Could not ask for notifications', error);
      }
    }
    await MonitorAdapter.setMonitoringEnabled(true);
  },

  /** The only way monitoring is ever turned off: an explicit request from the user. */
  stop: (): Promise<void> => MonitorAdapter.setMonitoringEnabled(false),

  getStatus: (): Promise<MonitorStatus> => MonitorAdapter.getMonitorStatus(),

  /**
   * If the user wants monitoring but the service is not running (for example after the app was
   * force-stopped), starts it again and returns the fresh status. The intent is never changed
   * here, and a failed restart leaves the status as it was.
   */
  resumeIfInterrupted: async (
    status: MonitorStatus,
  ): Promise<MonitorStatus> => {
    if (!status.enabled || status.running) {
      return status;
    }
    try {
      await MonitorAdapter.setMonitoringEnabled(true);
      return await MonitorAdapter.getMonitorStatus();
    } catch (error) {
      logger.warn('[UsageTracker] Could not restart the monitor', error);
      return status;
    }
  },

  checkPermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    return PermissionsService.hasUsagePermission();
  },

  requestPermission: () => {
    if (Platform.OS === 'android') {
      PermissionsService.requestUsagePermission();
    }
  },

  checkOverlayPermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    return PermissionsService.hasOverlayPermission();
  },

  requestOverlayPermission: () => {
    if (Platform.OS === 'android') {
      PermissionsService.requestOverlayPermission();
    }
  },

  checkBatteryOptimization: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    return PermissionsService.isBatteryOptimizationIgnored();
  },

  requestIgnoreBatteryOptimization: () => {
    if (Platform.OS === 'android') {
      PermissionsService.requestIgnoreBatteryOptimization();
    }
  },
};

export default UsageTracker;
