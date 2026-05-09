import { BlockedApp } from '../../core/types/domain.types';

export interface IBlockedAppsRepository {
  getBlockedApps(): Promise<BlockedApp[]>;
  addBlockedApp(app: BlockedApp): Promise<BlockedApp[]>;
  removeBlockedApp(packageName: string): Promise<BlockedApp[]>;
  toggleBlockedApp(packageName: string): Promise<BlockedApp[]>;
}
