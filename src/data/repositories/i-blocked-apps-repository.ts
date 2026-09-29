import { BlockedApp } from '../../core/types/domain.types';

export interface IBlockedAppsRepository {
  getBlockedApps(): Promise<BlockedApp[]>;
  addBlockedApp(app: BlockedApp): Promise<BlockedApp[]>;
  removeBlockedApp(packageName: string): Promise<BlockedApp[]>;
  toggleBlockedApp(packageName: string): Promise<BlockedApp[]>;
  /** Pushes the stored apps to the native monitor, whether or not anything changed. */
  syncToNative(): Promise<void>;
}
