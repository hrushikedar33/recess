import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCases } from '../../app/di';
import { RootStackParamList } from '../../app/navigation/types';
import { AppInfo, BlockedApp } from '../../core/types/domain.types';

type NavProp = StackNavigationProp<RootStackParamList>;

const PRESET_LIMITS = [5, 10, 15, 20, 30, 45, 60];
const PRESET_COOLDOWNS = [5, 10, 15, 30];

export function useAddAppViewModel() {
  const navigation = useNavigation<NavProp>();
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [limitMinutes, setLimitMinutes] = useState(10);
  const [cooldownMinutes, setCooldownMinutes] = useState(10);
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

  const handleSave = useCallback(async () => {
    if (!selectedApp) {
      return;
    }

    setSaving(true);

    try {
      const blockedApp: BlockedApp = {
        packageName: selectedApp.packageName,
        appName: selectedApp.appName,
        limitMinutes,
        cooldownMinutes,
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
  }, [cooldownMinutes, limitMinutes, navigation, selectedApp]);

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
    saving,
    handleSave,
    handleBack: () => setSelectedApp(null),
    handleSelectApp: setSelectedApp,
    presetLimits: PRESET_LIMITS,
    presetCooldowns: PRESET_COOLDOWNS,
  };
}
