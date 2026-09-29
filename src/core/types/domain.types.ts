export interface BlockedApp {
  packageName: string;
  appName: string;
  /** The session limit: minutes in one go before the cooldown starts. */
  limitMinutes: number;
  cooldownMinutes: number;
  /** Minutes allowed per day across all sessions. Rules saved before this existed have none. */
  dailyLimitMinutes?: number;
  isActive: boolean;
  iconBase64?: string;
}

export interface AppInfo {
  packageName: string;
  appName: string;
  iconBase64?: string;
}

export interface Goal {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}
