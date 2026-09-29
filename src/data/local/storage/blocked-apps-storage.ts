import { BLOCKED_APPS_STORAGE_KEY } from '../../../core/constants/storage.keys';
import { BlockedApp } from '../../../core/types/domain.types';
import { AsyncStorageAdapter } from './async-storage-adapter';

export const BlockedAppsStorage = {
  /**
   * The stored apps, an empty list when nothing was ever stored, or null when what is stored cannot
   * be read. The difference matters: callers that mirror the apps elsewhere must not treat
   * "unreadable" as "the user has no apps".
   */
  readBlockedApps: async (): Promise<BlockedApp[] | null> => {
    try {
      const raw = await AsyncStorageAdapter.getItem(BLOCKED_APPS_STORAGE_KEY);
      if (raw === null) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as BlockedApp[]) : null;
    } catch {
      return null;
    }
  },

  /** For display and editing: unreadable storage shows as an empty list. */
  getBlockedApps: async (): Promise<BlockedApp[]> =>
    (await BlockedAppsStorage.readBlockedApps()) ?? [],

  saveBlockedApps: async (apps: BlockedApp[]): Promise<void> => {
    await AsyncStorageAdapter.setItem(
      BLOCKED_APPS_STORAGE_KEY,
      JSON.stringify(apps),
    );
  },
};
