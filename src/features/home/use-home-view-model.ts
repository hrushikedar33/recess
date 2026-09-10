import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCases } from '../../app/di';
import { Routes } from '../../app/navigation/routes';
import { RootStackParamList } from '../../app/navigation/types';
import { BlockedApp, LimitReachedPayload } from '../../core/types/domain.types';
import { useDeviceEventListener } from '../../core/hooks/use-device-event-listener';
import UsageTracker from '../../services/tracker/usage-tracker-service';
import { AppListAdapter } from '../../data/local/native/app-list-adapter';

type NavProp = StackNavigationProp<RootStackParamList>;

export function useHomeViewModel() {
  const navigation = useNavigation<NavProp>();
  const [blockedApps, setBlockedApps] = useState<BlockedApp[]>([]);
  const [trackerRunning, setTrackerRunning] = useState(false);
  const [hasUsagePermission, setHasUsagePermission] = useState(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [hasBatteryOptimizationIgnored, setHasBatteryOptimizationIgnored] = useState(true);
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
    setTrackerRunning(UsageTracker.isRunning());
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
      checkPermissions();
    }, [loadApps, checkPermissions]),
  );

  useDeviceEventListener<LimitReachedPayload>(
    'APP_LIMIT_REACHED',
    useCallback(
      (payload) => {
        navigation.navigate(Routes.BlockOverlay, payload);
      },
      [navigation],
    ),
  );

  const handleToggleTracker = useCallback(async () => {
    if (trackerBusy) {
      return;
    }

    setTrackerBusy(true);

    if (!hasUsagePermission) {
      try {
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
      } finally {
        setTrackerBusy(false);
      }

      return;
    }

    if (!hasOverlayPermission) {
      try {
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
      } finally {
        setTrackerBusy(false);
      }

      return;
    }

    if (!hasBatteryOptimizationIgnored && !UsageTracker.isRunning()) {
      Alert.alert(
        'Battery Optimization Active',
        'Android or your phone manufacturer may close Recess in the background. Disable battery optimization to ensure Recess stays running.',
        [
          {
            text: 'Skip',
            style: 'cancel',
            onPress: async () => {
              try {
                await UsageTracker.start();
                setTrackerRunning(true);
              } catch {
                Alert.alert('Tracker Error', 'Could not start background tracker.');
              } finally {
                setTrackerBusy(false);
              }
            },
          },
          {
            text: 'Disable',
            onPress: () => {
              UsageTracker.requestIgnoreBatteryOptimization();
              setTrackerBusy(false);
            },
          },
        ],
      );
      return;
    }

    try {
      const running = UsageTracker.isRunning();

      if (running) {
        await UsageTracker.stop();
        setTrackerRunning(false);
      } else {
        await UsageTracker.start();
        setTrackerRunning(true);
      }
    } catch (error) {
      Alert.alert('Tracker Error', 'Could not update the background tracker.');
    } finally {
      setTrackerBusy(false);
    }
  }, [hasUsagePermission, hasOverlayPermission, hasBatteryOptimizationIgnored, trackerBusy]);

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
  }, [hasUsagePermission, hasOverlayPermission, hasBatteryOptimizationIgnored, checkPermissions]);

  const handleAddApp = useCallback(() => {
    navigation.navigate(Routes.AddApp);
  }, [navigation]);

  const permissionBannerText = !hasUsagePermission
    ? '⚠️ Grant Usage Access permission to enable tracking'
    : !hasOverlayPermission
    ? '⚠️ Grant "Display over other apps" permission to enable blocking'
    : '🔋 Disable battery optimization to keep Recess active';

  const shouldShowPermissionBanner =
    Platform.OS === 'android' &&
    (!hasUsagePermission || !hasOverlayPermission || !hasBatteryOptimizationIgnored);

  return {
    blockedApps,
    trackerRunning,
    trackerBusy,
    hasPermission: hasUsagePermission && hasOverlayPermission && hasBatteryOptimizationIgnored,
    shouldShowPermissionBanner,
    permissionBannerText,
    handleToggleTracker,
    handleToggleApp,
    handleRemoveApp,
    handleRequestPermission,
    handleAddApp,
  };
}
