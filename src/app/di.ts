import { BlockedAppsRepository } from '../data/repositories/blocked-apps-repository';
import { GoalsRepository } from '../data/repositories/goals-repository';
import { LimitEventRepository } from '../data/repositories/limit-event-repository';
import { NoticesRepository } from '../data/repositories/notices-repository';
import { InstalledAppsRepository } from '../data/repositories/installed-apps-repository';
import { AddBlockedAppUseCase } from '../domain/usecases/add-blocked-app-use-case';
import { AddGoalUseCase } from '../domain/usecases/add-goal-use-case';
import { CheckUsageLimitUseCase } from '../domain/usecases/check-usage-limit-use-case';
import { GetBlockedAppsUseCase } from '../domain/usecases/get-blocked-apps-use-case';
import { GetGoalsUseCase } from '../domain/usecases/get-goals-use-case';
import { GetLimitEventUseCase } from '../domain/usecases/get-limit-event-use-case';
import { ManageNoticesUseCase } from '../domain/usecases/manage-notices-use-case';
import { GetInstalledAppsUseCase } from '../domain/usecases/get-installed-apps-use-case';
import { RemoveBlockedAppUseCase } from '../domain/usecases/remove-blocked-app-use-case';
import { RemoveGoalUseCase } from '../domain/usecases/remove-goal-use-case';
import { SyncBlockedAppsUseCase } from '../domain/usecases/sync-blocked-apps-use-case';
import { SyncGoalsUseCase } from '../domain/usecases/sync-goals-use-case';
import { ToggleBlockedAppUseCase } from '../domain/usecases/toggle-blocked-app-use-case';
import { ToggleGoalUseCase } from '../domain/usecases/toggle-goal-use-case';

const blockedAppsRepository = new BlockedAppsRepository();
const installedAppsRepository = new InstalledAppsRepository();
const goalsRepository = new GoalsRepository();
const limitEventRepository = new LimitEventRepository();
const noticesRepository = new NoticesRepository();

export const repositories = {
  blockedApps: blockedAppsRepository,
  installedApps: installedAppsRepository,
  goals: goalsRepository,
  limitEvents: limitEventRepository,
};

export const useCases = {
  getBlockedApps: new GetBlockedAppsUseCase(blockedAppsRepository),
  addBlockedApp: new AddBlockedAppUseCase(blockedAppsRepository),
  removeBlockedApp: new RemoveBlockedAppUseCase(blockedAppsRepository),
  toggleBlockedApp: new ToggleBlockedAppUseCase(blockedAppsRepository),
  syncBlockedApps: new SyncBlockedAppsUseCase(blockedAppsRepository),
  getInstalledApps: new GetInstalledAppsUseCase(installedAppsRepository),
  checkUsageLimit: new CheckUsageLimitUseCase(),
  getGoals: new GetGoalsUseCase(goalsRepository),
  addGoal: new AddGoalUseCase(goalsRepository),
  toggleGoal: new ToggleGoalUseCase(goalsRepository),
  removeGoal: new RemoveGoalUseCase(goalsRepository),
  syncGoals: new SyncGoalsUseCase(goalsRepository),
  getLimitEvent: new GetLimitEventUseCase(limitEventRepository),
  notices: new ManageNoticesUseCase(noticesRepository),
};
