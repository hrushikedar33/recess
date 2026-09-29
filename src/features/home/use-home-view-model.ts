import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCases } from '../../app/di';
import { Routes } from '../../app/navigation/routes';
import { RootStackParamList } from '../../app/navigation/types';
import { BlockedApp, Goal } from '../../core/types/domain.types';
import { MonitorStatus } from '../../core/types/native.types';
import { useAppState } from '../../core/hooks/use-app-state';
import { logger } from '../../core/utils/logger';
import UsageTracker from '../../services/tracker/usage-tracker-service';
import { AppListAdapter } from '../../data/local/native/app-list-adapter';
import { NoticeState } from '../../data/repositories/notices-repository';
import { summarizeGoals } from '../goals/goals-summary';
import { describeMonitorHealth } from './monitor-health';
import { oemGuidance } from './oem-guidance';
import { describeStopReason } from './stop-reason';

type NavProp = StackNavigationProp<RootStackParamList>;

export function useHomeViewModel() {
  const navigation = useNavigation<NavProp>();
  const [blockedApps, setBlockedApps] = useState<BlockedApp[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus | null>(
    null,
  );
  const [notices, setNotices] = useState<NoticeState>({
    ackedStopReason: null,
    oemGuidanceDismissed: false,
  });
  const [now, setNow] = useState(() => Date.now());
  const appState = useAppState();
  const [hasUsagePermission, setHasUsagePermission] = useState(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [hasBatteryOptimizationIgnored, setHasBatteryOptimizationIgnored] =
    useState(true);
  const [trackerBusy, setTrackerBusy] = useState(false);

  const loadApps = useCallback(async () => {
    const apps = await useCases.getBlockedApps.execute();
    const appsWithIcons = await Promise.all(
      apps.map(async (app) => {
        if (!app.iconBase64 && AppListAdapter?.getAppIcon) {
          try {
            const icon = await AppListAdapter.getAppIcon(app.packageName);
            if (icon) {
              return { ...app, iconBase64: icon };
            }
          } catch {
            // ignore
          }
        }
        return app;
      }),
    );
    setBlockedApps(appsWithIcons);
  }, []);

  const loadGoals = useCallback(async () => {
    try {
      setGoals(await useCases.getGoals.execute());
    } catch {
      // The summary card just stays as it was; goals are managed on their own screen.
    }
  }, []);

  /**
   * The toggle shows what the user asked for, read from native storage, never a JS-side guess. If
   * they asked for monitoring but the service is not running it is started again here.
   */
  const refreshMonitorStatus = useCallback(async () => {
    try {
      const status = await UsageTracker.getStatus();
      setMonitorStatus(await UsageTracker.resumeIfInterrupted(status));
      setNotices(await useCases.notices.getState());
      setNow(Date.now());
    } catch (error) {
      logger.warn('[Home] Could not read the monitor status', error);
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    const usageGranted = await UsageTracker.checkPermission();
    const overlayGranted = await UsageTracker.checkOverlayPermission();
    const batteryIgnored = await UsageTracker.checkBatteryOptimization();
    setHasUsagePermission(usageGranted);
    setHasOverlayPermission(overlayGranted);
    setHasBatteryOptimizationIgnored(batteryIgnored);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadApps();
      loadGoals();
      checkPermissions();
    }, [loadApps, loadGoals, checkPermissions]),
  );

  // On open and every time the app comes back to the foreground (for example after the user
  // returned from Settings, or the OS stopped the service in the background).
  useEffect(() => {
    if (appState !== 'background') {
      refreshMonitorStatus();
    }
  }, [appState, refreshMonitorStatus]);

  const trackerEnabled = monitorStatus?.enabled ?? false;

  useEffect(() => {
    if (!trackerEnabled) {
      return undefined;
    }
    // Re-read the status on the same beat that moves "now" forward. Advancing the clock alone would
    // make a healthy monitor look stuck after two minutes, because the card would still hold the
    // last check-in from when it was first read. Reading never restarts or changes anything.
    const timer = setInterval(() => {
      setNow(Date.now());
      UsageTracker.getStatus()
        .then(setMonitorStatus)
        .catch((error: unknown) => {
          logger.warn('[Home] Could not refresh the monitor status', error);
        });
    }, 10_000);
    return () => clearInterval(timer);
  }, [trackerEnabled]);

  const stopReason = monitorStatus?.lastStopReason ?? null;
  // Identify an interruption by what happened *and when*, so the same kind of interruption
  // happening again is shown again instead of being taken for the one already dismissed.
  const stopKey =
    stopReason === null
      ? null
      : `${stopReason}@${monitorStatus?.lastStopReasonAt ?? ''}`;
  const interruptionNote =
    trackerEnabled && stopKey !== notices.ackedStopReason
      ? describeStopReason(stopReason)
      : null;

  const guidance =
    trackerEnabled && Platform.OS === 'android' && !notices.oemGuidanceDismissed
      ? oemGuidance(
          (Platform.constants as { Manufacturer?: string } | undefined)
            ?.Manufacturer,
        )
      : null;

  const handleDismissInterruption = useCallback(async () => {
    if (stopKey === null) {
      return;
    }
    await useCases.notices.acknowledgeStopReason(stopKey);
    setNotices((previous) => ({ ...previous, ackedStopReason: stopKey }));
  }, [stopKey]);

  const handleDismissOemGuidance = useCallback(async () => {
    await useCases.notices.dismissOemGuidance();
    setNotices((previous) => ({ ...previous, oemGuidanceDismissed: true }));
  }, []);

  const handleOpenAppSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const enableTracker = useCallback(async () => {
    setTrackerBusy(true);
    try {
      await UsageTracker.start();
      await refreshMonitorStatus();
    } catch (error) {
      logger.warn('[Home] Could not start monitoring', error);
      Alert.alert('Tracker Error', 'Could not start the background tracker.');
    } finally {
      setTrackerBusy(false);
    }
  }, [refreshMonitorStatus]);

  const handleToggleTracker = useCallback(async () => {
    if (trackerBusy) {
      return;
    }

    if (trackerEnabled) {
      setTrackerBusy(true);
      try {
        await UsageTracker.stop();
        await refreshMonitorStatus();
      } catch (error) {
        logger.warn('[Home] Could not stop monitoring', error);
        Alert.alert(
          'Tracker Error',
          'Could not update the background tracker.',
        );
      } finally {
        setTrackerBusy(false);
      }
      return;
    }

    if (!hasUsagePermission) {
      Alert.alert(
        'Permission Required',
        'Recess needs Usage Access permission to monitor apps.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Grant Permission',
            onPress: () => {
              UsageTracker.requestPermission();
            },
          },
        ],
      );
      return;
    }

    if (!hasOverlayPermission) {
      Alert.alert(
        'Permission Required',
        'Recess needs "Display over other apps" permission to close blocked apps and show the timer.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Grant Permission',
            onPress: () => {
              UsageTracker.requestOverlayPermission();
            },
          },
        ],
      );
      return;
    }

    if (!hasBatteryOptimizationIgnored) {
      Alert.alert(
        'Battery Optimization Active',
        'Android or your phone manufacturer may close Recess in the background. Disable battery optimization to ensure Recess stays running.',
        [
          { text: 'Skip', style: 'cancel', onPress: () => enableTracker() },
          {
            text: 'Disable',
            onPress: () => {
              UsageTracker.requestIgnoreBatteryOptimization();
            },
          },
        ],
      );
      return;
    }

    await enableTracker();
  }, [
    trackerBusy,
    trackerEnabled,
    hasUsagePermission,
    hasOverlayPermission,
    hasBatteryOptimizationIgnored,
    enableTracker,
    refreshMonitorStatus,
  ]);

  const handleToggleApp = useCallback(async (packageName: string) => {
    try {
      const updated = await useCases.toggleBlockedApp.execute(packageName);
      setBlockedApps(updated);
    } catch {
      Alert.alert('App Error', 'Could not update the app state.');
    }
  }, []);

  const handleRemoveApp = useCallback((app: BlockedApp) => {
    Alert.alert('Remove App', `Stop blocking ${app.appName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await useCases.removeBlockedApp.execute(
              app.packageName,
            );
            setBlockedApps(updated);
          } catch {
            Alert.alert('App Error', 'Could not remove the app.');
          }
        },
      },
    ]);
  }, []);

  const handleRequestPermission = useCallback(() => {
    if (!hasUsagePermission) {
      UsageTracker.requestPermission();
    } else if (!hasOverlayPermission) {
      UsageTracker.requestOverlayPermission();
    } else if (!hasBatteryOptimizationIgnored) {
      UsageTracker.requestIgnoreBatteryOptimization();
    }
    setTimeout(() => {
      checkPermissions();
    }, 2000);
  }, [
    hasUsagePermission,
    hasOverlayPermission,
    hasBatteryOptimizationIgnored,
    checkPermissions,
  ]);

  const handleAddApp = useCallback(() => {
    navigation.navigate(Routes.AddApp);
  }, [navigation]);

  const handleOpenGoals = useCallback(() => {
    navigation.navigate(Routes.Goals);
  }, [navigation]);

  const permissionBannerText = !hasUsagePermission
    ? '⚠️ Grant Usage Access permission to enable tracking'
    : !hasOverlayPermission
    ? '⚠️ Grant "Display over other apps" permission to enable blocking'
    : '🔋 Disable battery optimization to keep Recess active';

  const shouldShowPermissionBanner =
    Platform.OS === 'android' &&
    (!hasUsagePermission ||
      !hasOverlayPermission ||
      !hasBatteryOptimizationIgnored);

  return {
    blockedApps,
    goalsSummary: summarizeGoals(goals),
    handleOpenGoals,
    trackerEnabled,
    monitorHealth: describeMonitorHealth(monitorStatus, now),
    interruptionNote,
    oemGuidance: guidance,
    handleDismissInterruption,
    handleDismissOemGuidance,
    handleOpenAppSettings,
    trackerBusy,
    hasPermission:
      hasUsagePermission &&
      hasOverlayPermission &&
      hasBatteryOptimizationIgnored,
    shouldShowPermissionBanner,
    permissionBannerText,
    handleToggleTracker,
    handleToggleApp,
    handleRemoveApp,
    handleRequestPermission,
    handleAddApp,
  };
}
