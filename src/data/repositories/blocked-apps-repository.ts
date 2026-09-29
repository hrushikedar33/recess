import { BlockedApp } from '../../core/types/domain.types';
import { logger } from '../../core/utils/logger';
import { MonitorAdapter } from '../local/native/monitor-adapter';
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

    await this.save(updated);
    return updated;
  }

  async removeBlockedApp(packageName: string): Promise<BlockedApp[]> {
    const apps = await BlockedAppsStorage.getBlockedApps();
    const updated = apps.filter((app) => app.packageName !== packageName);

    await this.save(updated);
    return updated;
  }

  async toggleBlockedApp(packageName: string): Promise<BlockedApp[]> {
    const apps = await BlockedAppsStorage.getBlockedApps();
    const updated = apps.map((app) =>
      app.packageName === packageName
        ? { ...app, isActive: !app.isActive }
        : app,
    );

    await this.save(updated);
    return updated;
  }

  async syncToNative(): Promise<void> {
    await this.pushToNative(await BlockedAppsStorage.getBlockedApps());
  }

  private async save(apps: BlockedApp[]): Promise<void> {
    await BlockedAppsStorage.saveBlockedApps(apps);
    await this.pushToNative(apps);
  }

  /**
   * Native holds a mirror of the apps. A failed push must not fail the user's change: it is
   * logged, and the full re-sync on the next app start repairs the mirror.
   */
  private async pushToNative(apps: BlockedApp[]): Promise<void> {
    try {
      await MonitorAdapter.syncBlockedApps(apps);
    } catch (error) {
      logger.warn(
        '[BlockedAppsRepository] Could not sync apps to native',
        error,
      );
    }
  }
}
