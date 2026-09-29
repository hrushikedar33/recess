export interface BlockedApp {
  packageName: string;
  appName: string;
  limitMinutes: number;
  cooldownMinutes: number;
  isActive: boolean;
  iconBase64?: string;
}

export interface AppInfo {
  packageName: string;
  appName: string;
  iconBase64?: string;
}

export interface LimitReachedPayload {
  packageName: string;
  appName: string;
  limitMinutes: number;
  cooldownMinutes: number;
  usageMinutes: number;
  remainingCooldownSeconds?: number;
}

export interface Goal {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}
