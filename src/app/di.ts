import { BlockedAppsRepository } from '../data/repositories/blocked-apps-repository';
import { InstalledAppsRepository } from '../data/repositories/installed-apps-repository';
import { AddBlockedAppUseCase } from '../domain/usecases/add-blocked-app-use-case';
import { CheckUsageLimitUseCase } from '../domain/usecases/check-usage-limit-use-case';
import { GetBlockedAppsUseCase } from '../domain/usecases/get-blocked-apps-use-case';
import { GetInstalledAppsUseCase } from '../domain/usecases/get-installed-apps-use-case';
import { RemoveBlockedAppUseCase } from '../domain/usecases/remove-blocked-app-use-case';
import { ToggleBlockedAppUseCase } from '../domain/usecases/toggle-blocked-app-use-case';

const blockedAppsRepository = new BlockedAppsRepository();
const installedAppsRepository = new InstalledAppsRepository();

export const repositories = {
  blockedApps: blockedAppsRepository,
  installedApps: installedAppsRepository,
};

export const useCases = {
  getBlockedApps: new GetBlockedAppsUseCase(blockedAppsRepository),
  addBlockedApp: new AddBlockedAppUseCase(blockedAppsRepository),
  removeBlockedApp: new RemoveBlockedAppUseCase(blockedAppsRepository),
  toggleBlockedApp: new ToggleBlockedAppUseCase(blockedAppsRepository),
  getInstalledApps: new GetInstalledAppsUseCase(installedAppsRepository),
  checkUsageLimit: new CheckUsageLimitUseCase(),
};
