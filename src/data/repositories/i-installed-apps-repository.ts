import { AppInfo } from '../../core/types/domain.types';

export interface IInstalledAppsRepository {
  getInstalledApps(): Promise<AppInfo[]>;
}
