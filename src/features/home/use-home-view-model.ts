import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCases } from '../../app/di';
import { Routes } from '../../app/navigation/routes';
import { RootStackParamList } from '../../app/navigation/types';
import { BlockedApp, LimitReachedPayload } from '../../core/types/domain.types';
import { useDeviceEventListener } from '../../core/hooks/use-device-event-listener';
import UsageTracker from '../../services/tracker/usage-tracker-service';

type NavProp = StackNavigationProp<RootStackParamList>;

export function useHomeViewModel() {
  const navigation = useNavigation<NavProp>();
  const [blockedApps, setBlockedApps] = useState<BlockedApp[]>([]);
  const [trackerRunning, setTrackerRunning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [trackerBusy, setTrackerBusy] = useState(false);

  const loadApps = useCallback(async () => {
    const apps = await useCases.getBlockedApps.execute();
    setBlockedApps(apps);
    setTrackerRunning(UsageTracker.isRunning());
  }, []);

  const checkPermission = useCallback(async () => {
    const permissionGranted = await UsageTracker.checkPermission();
    setHasPermission(permissionGranted);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadApps();
    }, [loadApps]),
  );

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

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

    if (!hasPermission) {
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
  }, [hasPermission, trackerBusy]);

  const handleToggleApp = useCallback(async (packageName: string) => {
    const updated = await useCases.toggleBlockedApp.execute(packageName);
    setBlockedApps(updated);
  }, []);

  const handleRemoveApp = useCallback((app: BlockedApp) => {
    Alert.alert('Remove App', `Stop blocking ${app.appName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = await useCases.removeBlockedApp.execute(
            app.packageName,
          );
          setBlockedApps(updated);
        },
      },
    ]);
  }, []);

  const handleRequestPermission = useCallback(() => {
    UsageTracker.requestPermission();
    setTimeout(() => {
      checkPermission();
    }, 3000);
  }, [checkPermission]);

  const handleAddApp = useCallback(() => {
    navigation.navigate(Routes.AddApp);
  }, [navigation]);

  return {
    blockedApps,
    trackerRunning,
    trackerBusy,
    hasPermission,
    shouldShowPermissionBanner: Platform.OS === 'android' && !hasPermission,
    handleToggleTracker,
    handleToggleApp,
    handleRemoveApp,
    handleRequestPermission,
    handleAddApp,
  };
}
