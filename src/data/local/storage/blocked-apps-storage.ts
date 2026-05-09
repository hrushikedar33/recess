import { BLOCKED_APPS_STORAGE_KEY } from '../../../core/constants/storage.keys';
import { BlockedApp } from '../../../core/types/domain.types';
import { AsyncStorageAdapter } from './async-storage-adapter';

export const BlockedAppsStorage = {
  getBlockedApps: async (): Promise<BlockedApp[]> => {
    try {
      const raw = await AsyncStorageAdapter.getItem(BLOCKED_APPS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveBlockedApps: async (apps: BlockedApp[]): Promise<void> => {
    await AsyncStorageAdapter.setItem(
      BLOCKED_APPS_STORAGE_KEY,
      JSON.stringify(apps),
    );
  },
};
