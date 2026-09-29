import { NativeModules } from 'react-native';
import { AppError } from '../../../core/errors/app-error';
import { BlockedApp } from '../../../core/types/domain.types';
import {
  BlockedAppSyncPayload,
  GoalSyncPayload,
  LimitEvent,
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

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** The saved event is written by native code, but anything unreadable is treated as "no event". */
const parseLimitEvent = (raw: string | null): LimitEvent | null => {
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const quote = value.quote as Record<string, unknown> | undefined;
    if (
      !isText(value.packageName) ||
      !isText(value.appName) ||
      (value.reason !== 'SESSION_COOLDOWN' && value.reason !== 'DAILY_LIMIT') ||
      typeof value.blockedUntilMs !== 'number' ||
      typeof value.createdAtMs !== 'number' ||
      !quote ||
      !isText(quote.text) ||
      !isText(quote.author)
    ) {
      return null;
    }
    return {
      packageName: value.packageName,
      appName: value.appName,
      reason: value.reason,
      blockedUntilMs: value.blockedUntilMs,
      createdAtMs: value.createdAtMs,
      quote: {
        text: quote.text,
        author: quote.author,
        ...(isText(quote.source) ? { source: quote.source } : {}),
      },
    };
  } catch {
    return null;
  }
};

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

  getLimitEvent: async (): Promise<LimitEvent | null> =>
    parseLimitEvent(await call((module) => module.getLimitEvent())),

  syncBlockedApps: (apps: BlockedApp[]): Promise<void> =>
    call((module) =>
      module.syncBlockedApps(JSON.stringify(apps.map(toBlockedAppPayload))),
    ),

  syncGoals: (goals: GoalSyncPayload[]): Promise<void> =>
    call((module) =>
      module.syncGoals(JSON.stringify(goals.map(toGoalPayload))),
    ),
};
