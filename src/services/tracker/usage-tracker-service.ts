import { DeviceEventEmitter, Platform } from 'react-native';
import BackgroundActions from 'react-native-background-actions';
import { CHECK_INTERVAL_MS } from '../../core/constants/app.constants';
import { logger } from '../../core/utils/logger';
import { msToMinutes } from '../../core/utils/time.utils';
import { useCases } from '../../app/di';
import PermissionsService from '../permissions/permissions-service';
import { UsageStatsAdapter } from '../../data/local/native/usage-stats-adapter';

// Cooldown tracker: packageName -> timestamp when cooldown expires
const cooldownMap: Record<string, number> = {};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

interface TrackingTaskData {
  delay: number;
}

const trackingTask = async (taskData?: TrackingTaskData) => {
  if (Platform.OS !== 'android') return;

  const { delay } = taskData ?? { delay: CHECK_INTERVAL_MS };

  while (BackgroundActions.isRunning()) {
    try {
      const blockedApps = await useCases.getBlockedApps.execute();
      const activeApps = blockedApps.filter((a) => a.isActive);

      if (activeApps.length > 0) {
        const foregroundApp: string | null =
          await UsageStatsAdapter.getForegroundApp();

        if (foregroundApp) {
          const blockedApp = activeApps.find(
            (a) => a.packageName === foregroundApp,
          );

          if (blockedApp) {
            const now = Date.now();

            // Skip if in cooldown
            if (
              cooldownMap[foregroundApp] &&
              now < cooldownMap[foregroundApp]
            ) {
              await sleep(delay);
              continue;
            }

            const usageMs: number = await UsageStatsAdapter.getAppUsageToday(
              foregroundApp,
            );
            const usageMinutes = msToMinutes(usageMs);

            if (useCases.checkUsageLimit.execute(blockedApp, usageMinutes)) {
              // Set cooldown so we don't spam the overlay
              cooldownMap[foregroundApp] =
                now + blockedApp.cooldownMinutes * 60 * 1000;

              DeviceEventEmitter.emit('APP_LIMIT_REACHED', {
                packageName: foregroundApp,
                appName: blockedApp.appName,
                limitMinutes: blockedApp.limitMinutes,
                usageMinutes: Math.floor(usageMinutes),
              });
            }
          }
        }
      }
    } catch (e) {
      logger.warn('[UsageTracker] Error:', e);
    }

    await sleep(delay);
  }
};

const BACKGROUND_OPTIONS = {
  taskName: 'Recess',
  taskTitle: 'Recess is active',
  taskDesc: 'Monitoring your screen time...',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#FF4757',
  linkingURI: 'recess://home',
  parameters: { delay: CHECK_INTERVAL_MS },
};

const UsageTracker = {
  start: async () => {
    if (Platform.OS !== 'android') {
      logger.info(
        '[UsageTracker] Background tracking only supported on Android',
      );
      return;
    }
    if (BackgroundActions.isRunning()) return;
    await BackgroundActions.start(trackingTask, BACKGROUND_OPTIONS);
  },

  stop: async () => {
    if (BackgroundActions.isRunning()) {
      await BackgroundActions.stop();
    }
  },

  isRunning: () => BackgroundActions.isRunning(),

  checkPermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    return PermissionsService.hasUsagePermission();
  },

  requestPermission: () => {
    if (Platform.OS === 'android') {
      PermissionsService.requestUsagePermission();
    }
  },
};

export default UsageTracker;
