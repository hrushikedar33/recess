import { NativeModules } from 'react-native';
import { AppError } from '../../../core/errors/app-error';
import { BlockedApp } from '../../../core/types/domain.types';
import {
  BlockedAppSyncPayload,
  GoalSyncPayload,
  MonitorConfigNativeModule,
  MonitorStatus,
} from '../../../core/types/native.types';

const toBlockedAppPayload = (app: BlockedApp): BlockedAppSyncPayload => ({
  packageName: app.packageName,
  appName: app.appName,
  limitMinutes: app.limitMinutes,
  cooldownMinutes: app.cooldownMinutes,
  isActive: app.isActive,
});

const toGoalPayload = (goal: GoalSyncPayload): GoalSyncPayload => ({
  id: goal.id,
  title: goal.title,
  done: goal.done,
});

const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }
  const { code, message } = (error ?? {}) as {
    code?: unknown;
    message?: unknown;
  };
  return new AppError(
    typeof code === 'string' ? code : 'MONITOR_ERROR',
    typeof message === 'string' ? message : 'The monitor call failed.',
  );
};

/** Looks the module up per call so a missing module is reported, not crashed on. */
const call = async <T>(
  action: (module: MonitorConfigNativeModule) => Promise<T>,
): Promise<T> => {
  const module = NativeModules.MonitorConfigModule as
    | MonitorConfigNativeModule
    | undefined;
  if (!module) {
    throw new AppError(
      'NATIVE_UNAVAILABLE',
      'The monitor module is only available on Android.',
    );
  }
  try {
    return await action(module);
  } catch (error) {
    throw toAppError(error);
  }
};

export const MonitorAdapter = {
  setMonitoringEnabled: (enabled: boolean): Promise<void> =>
    call((module) => module.setMonitoringEnabled(enabled)),

  getMonitorStatus: (): Promise<MonitorStatus> =>
    call((module) => module.getMonitorStatus()),

  syncBlockedApps: (apps: BlockedApp[]): Promise<void> =>
    call((module) =>
      module.syncBlockedApps(JSON.stringify(apps.map(toBlockedAppPayload))),
    ),

  syncGoals: (goals: GoalSyncPayload[]): Promise<void> =>
    call((module) =>
      module.syncGoals(JSON.stringify(goals.map(toGoalPayload))),
    ),
};
