import { DeviceEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import BackgroundActions from 'react-native-background-actions';
import { CHECK_INTERVAL_MS } from '../../core/constants/app.constants';
import { logger } from '../../core/utils/logger';
import { useCases } from '../../app/di';
import PermissionsService from '../permissions/permissions-service';
import { UsageStatsAdapter } from '../../data/local/native/usage-stats-adapter';

interface AppSessionState {
  usedSeconds: number;
  cooldownExpiresAt: number | null;
  lastActiveTimestamp: number;
}

// Map: packageName -> session tracking state
const appSessionStates: Record<string, AppSessionState> = {};

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

        const now = Date.now();

        // 1. Check for apps whose cooldown/freeze has finished
        for (const app of activeApps) {
          const state = appSessionStates[app.packageName];
          if (
            state &&
            state.cooldownExpiresAt &&
            now >= state.cooldownExpiresAt
          ) {
            // Freeze time expired! Reset session for a fresh usage cycle
            state.cooldownExpiresAt = null;
            state.usedSeconds = 0;
            state.lastActiveTimestamp = 0;
            logger.info(
              `[UsageTracker] Cooldown expired for ${app.appName}. Ready for new session.`,
            );
          }
        }

        if (foregroundApp) {
          const blockedApp = activeApps.find(
            (a) => a.packageName === foregroundApp,
          );

          if (blockedApp) {
            if (!appSessionStates[foregroundApp]) {
              appSessionStates[foregroundApp] = {
                usedSeconds: 0,
                cooldownExpiresAt: null,
                lastActiveTimestamp: 0,
              };
            }

            const state = appSessionStates[foregroundApp];

            // A. IS THE APP IN FREEZE TIME (COOLDOWN)?
            if (state.cooldownExpiresAt && now < state.cooldownExpiresAt) {
              const remainingSec = Math.max(
                1,
                Math.ceil((state.cooldownExpiresAt - now) / 1000),
              );
              logger.info(
                `[UsageTracker] ${blockedApp.appName} is frozen! Remaining: ${remainingSec}s`,
              );

              // Close the blocked app and bring Recess overlay to front
              UsageStatsAdapter.sendAppToHome();
              UsageStatsAdapter.bringAppToForeground();
              UsageStatsAdapter.showLimitNotification(
                'Recess - Cooldown Active',
                `${blockedApp.appName} is paused for ${Math.ceil(remainingSec / 60)} more min`,
              );

              DeviceEventEmitter.emit('APP_LIMIT_REACHED', {
                packageName: foregroundApp,
                appName: blockedApp.appName,
                limitMinutes: blockedApp.limitMinutes,
                cooldownMinutes: blockedApp.cooldownMinutes,
                usageMinutes: blockedApp.limitMinutes,
                remainingCooldownSeconds: remainingSec,
              });

              await sleep(delay);
              continue;
            }

            // B. NOT IN FREEZE TIME: ACCUMULATE ACTIVE SESSION TIME
            const elapsed =
              state.lastActiveTimestamp > 0 &&
              now - state.lastActiveTimestamp < 4000
                ? (now - state.lastActiveTimestamp) / 1000
                : delay / 1000;

            state.usedSeconds += elapsed;
            state.lastActiveTimestamp = now;

            const limitSeconds = blockedApp.limitMinutes * 60;
            logger.info(
              `[UsageTracker] ${blockedApp.appName} session: ${Math.floor(
                state.usedSeconds,
              )}s / ${limitSeconds}s`,
            );

            // C. HAS THE SESSION LIMIT BEEN HIT?
            if (state.usedSeconds >= limitSeconds) {
              logger.info(
                `[UsageTracker] ${blockedApp.appName} reached limit! Entering freeze time.`,
              );

              const cooldownMs = blockedApp.cooldownMinutes * 60 * 1000;
              state.cooldownExpiresAt = now + cooldownMs;
              state.usedSeconds = 0;
              state.lastActiveTimestamp = 0;

              // Close the blocked app and bring Recess overlay to front
              UsageStatsAdapter.sendAppToHome();
              UsageStatsAdapter.bringAppToForeground();
              UsageStatsAdapter.showLimitNotification(
                'Recess - Time is Up!',
                `${blockedApp.appName} reached its limit. Time to pause!`,
              );

              DeviceEventEmitter.emit('APP_LIMIT_REACHED', {
                packageName: foregroundApp,
                appName: blockedApp.appName,
                limitMinutes: blockedApp.limitMinutes,
                cooldownMinutes: blockedApp.cooldownMinutes,
                usageMinutes: blockedApp.limitMinutes,
                remainingCooldownSeconds: blockedApp.cooldownMinutes * 60,
              });
            }
          } else {
            // Foreground app is not this blocked app; reset lastActiveTimestamp
            for (const pkg of Object.keys(appSessionStates)) {
              if (pkg !== foregroundApp) {
                appSessionStates[pkg].lastActiveTimestamp = 0;
              }
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
  taskIcon: { name: 'ic_notification', type: 'drawable' },
  foregroundServiceType: ['dataSync'] as ('dataSync')[],
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
    if (
      Platform.Version >= 33 &&
      PermissionsAndroid.RESULTS.GRANTED !==
        (await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        ))
    ) {
      throw new Error('Notification permission is required to start tracking');
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
