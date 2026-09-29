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

export interface Goal {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}
