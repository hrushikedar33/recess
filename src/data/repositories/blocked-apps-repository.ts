import { BlockedApp } from '../../core/types/domain.types';
import { BlockedAppsStorage } from '../local/storage/blocked-apps-storage';
import { IBlockedAppsRepository } from './i-blocked-apps-repository';

export class BlockedAppsRepository implements IBlockedAppsRepository {
  async getBlockedApps(): Promise<BlockedApp[]> {
    return BlockedAppsStorage.getBlockedApps();
  }

  async addBlockedApp(app: BlockedApp): Promise<BlockedApp[]> {
    const apps = await BlockedAppsStorage.getBlockedApps();
    const updated = apps.some((item) => item.packageName === app.packageName)
      ? apps.map((item) => (item.packageName === app.packageName ? app : item))
      : [...apps, app];

    await BlockedAppsStorage.saveBlockedApps(updated);
    return updated;
  }

  async removeBlockedApp(packageName: string): Promise<BlockedApp[]> {
    const apps = await BlockedAppsStorage.getBlockedApps();
    const updated = apps.filter((app) => app.packageName !== packageName);

    await BlockedAppsStorage.saveBlockedApps(updated);
    return updated;
  }

  async toggleBlockedApp(packageName: string): Promise<BlockedApp[]> {
    const apps = await BlockedAppsStorage.getBlockedApps();
    const updated = apps.map((app) =>
      app.packageName === packageName
        ? { ...app, isActive: !app.isActive }
        : app,
    );

    await BlockedAppsStorage.saveBlockedApps(updated);
    return updated;
  }
}
