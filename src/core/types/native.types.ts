export interface UsageStatsNativeModule {
  hasPermission(): Promise<boolean>;
  requestPermission(): void;
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): void;
  isBatteryOptimizationIgnored(): Promise<boolean>;
  requestIgnoreBatteryOptimization(): void;
}

export interface AppListNativeModule {
  getInstalledApps(): Promise<import('./domain.types').AppInfo[]>;
  getAppIcon(packageName: string): Promise<string | null>;
}

export interface MonitorStatus {
  /** The user's intent: only a user tap changes this. */
  enabled: boolean;
  /** Whether the native service has a fresh heartbeat. */
  running: boolean;
  lastHeartbeatAt: number | null;
  lastStopReason: string | null;
  /** Names of problems that leave the service running but not fully working. Empty when healthy. */
  health: string[];
}

/** The blocked-app fields native needs. Icons never cross the bridge. */
export interface BlockedAppSyncPayload {
  packageName: string;
  appName: string;
  limitMinutes: number;
  cooldownMinutes: number;
  isActive: boolean;
}

export interface GoalSyncPayload {
  id: string;
  title: string;
  done: boolean;
}

export type LimitReason = 'SESSION_COOLDOWN' | 'DAILY_LIMIT';

/** What the monitor last showed when a limit was reached; the Break screen shows the same. */
export interface LimitEvent {
  packageName: string;
  appName: string;
  reason: LimitReason;
  blockedUntilMs: number;
  createdAtMs: number;
  quote: { text: string; author: string; source?: string };
}

export interface MonitorConfigNativeModule {
  setMonitoringEnabled(enabled: boolean): Promise<void>;
  getMonitorStatus(): Promise<MonitorStatus>;
  /** The last limit event as JSON, or null if there has been none. */
  getLimitEvent(): Promise<string | null>;
  /** JSON list of {@link BlockedAppSyncPayload}; rejects with code INVALID_CONFIG if malformed. */
  syncBlockedApps(json: string): Promise<void>;
  /** JSON list of {@link GoalSyncPayload}; rejects with code INVALID_CONFIG if malformed. */
  syncGoals(json: string): Promise<void>;
}
