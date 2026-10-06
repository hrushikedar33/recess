import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCases } from '../../app/di';
import { RootStackParamList } from '../../app/navigation/types';
import {
  DEFAULT_COOLDOWN_MINUTES,
  DEFAULT_DAILY_LIMIT_MINUTES,
  DEFAULT_LIMIT_MINUTES,
} from '../../core/constants/app.constants';
import { AppInfo, BlockedApp } from '../../core/types/domain.types';
import { validateLimits } from '../../domain/limits';

type NavProp = StackNavigationProp<RootStackParamList>;

const PRESET_LIMITS = [5, 10, 15, 20, 30, 45, 60];
const PRESET_COOLDOWNS = [5, 10, 15, 30];
const PRESET_DAILY_LIMITS = [15, 30, 60, 90, 120, 180];

export function useAddAppViewModel() {
  const navigation = useNavigation<NavProp>();
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [limitMinutes, setLimitMinutes] = useState(DEFAULT_LIMIT_MINUTES);
  const [cooldownMinutes, setCooldownMinutes] = useState(
    DEFAULT_COOLDOWN_MINUTES,
  );
  const [dailyLimitMinutes, setDailyLimitMinutes] = useState<number | null>(
    DEFAULT_DAILY_LIMIT_MINUTES,
  );
  const [saving, setSaving] = useState(false);

  const loadApps = useCallback(async () => {
    try {
      const sorted = await useCases.getInstalledApps.execute();
      setApps(sorted);
    } catch {
      Alert.alert('Error', 'Could not load installed apps.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const filteredApps = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? apps.filter((app) => app.appName.toLowerCase().includes(query))
      : apps;
  }, [apps, search]);

  const error = useMemo(
    () => validateLimits({ limitMinutes, cooldownMinutes, dailyLimitMinutes }),
    [limitMinutes, cooldownMinutes, dailyLimitMinutes],
  );

  const handleSave = useCallback(async () => {
    if (!selectedApp || error !== null) {
      return;
    }

    setSaving(true);

    try {
      const blockedApp: BlockedApp = {
        packageName: selectedApp.packageName,
        appName: selectedApp.appName,
        limitMinutes,
        cooldownMinutes,
        dailyLimitMinutes: dailyLimitMinutes ?? undefined,
        isActive: true,
        iconBase64: selectedApp.iconBase64,
      };

      await useCases.addBlockedApp.execute(blockedApp);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save app.');
    } finally {
      setSaving(false);
    }
  }, [
    cooldownMinutes,
    dailyLimitMinutes,
    error,
    limitMinutes,
    navigation,
    selectedApp,
  ]);

  return {
    apps,
    filteredApps,
    search,
    setSearch,
    loading,
    selectedApp,
    setSelectedApp,
    limitMinutes,
    setLimitMinutes,
    cooldownMinutes,
    setCooldownMinutes,
    dailyLimitMinutes,
    setDailyLimitMinutes,
    error,
    canSave: error === null && !saving,
    saving,
    handleSave,
    handleBack: () => setSelectedApp(null),
    handleClose: () => navigation.goBack(),
    handleSelectApp: setSelectedApp,
    presetLimits: PRESET_LIMITS,
    presetCooldowns: PRESET_COOLDOWNS,
    presetDailyLimits: PRESET_DAILY_LIMITS,
  };
}
