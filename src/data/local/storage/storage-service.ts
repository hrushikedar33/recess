import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlockedApp } from '../../../core/types/domain.types';
import { BLOCKED_APPS_STORAGE_KEY } from '../../../core/constants/storage.keys';

const StorageService = {
  getBlockedApps: async (): Promise<BlockedApp[]> => {
    try {
      const raw = await AsyncStorage.getItem(BLOCKED_APPS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveBlockedApps: async (apps: BlockedApp[]): Promise<void> => {
    await AsyncStorage.setItem(BLOCKED_APPS_STORAGE_KEY, JSON.stringify(apps));
  },

  addBlockedApp: async (app: BlockedApp): Promise<BlockedApp[]> => {
    const apps = await StorageService.getBlockedApps();
    const exists = apps.find((a) => a.packageName === app.packageName);
    if (exists) {
      const updated = apps.map((a) =>
        a.packageName === app.packageName ? app : a,
      );
      await StorageService.saveBlockedApps(updated);
      return updated;
    }
    const updated = [...apps, app];
    await StorageService.saveBlockedApps(updated);
    return updated;
  },

  removeBlockedApp: async (packageName: string): Promise<BlockedApp[]> => {
    const apps = await StorageService.getBlockedApps();
    const updated = apps.filter((a) => a.packageName !== packageName);
    await StorageService.saveBlockedApps(updated);
    return updated;
  },

  toggleApp: async (packageName: string): Promise<BlockedApp[]> => {
    const apps = await StorageService.getBlockedApps();
    const updated = apps.map((a) =>
      a.packageName === packageName ? { ...a, isActive: !a.isActive } : a,
    );
    await StorageService.saveBlockedApps(updated);
    return updated;
  },
};

export default StorageService;
