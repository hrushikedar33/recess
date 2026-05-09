export interface UsageStatsNativeModule {
  hasPermission(): Promise<boolean>;
  requestPermission(): void;
  getAppUsageToday(packageName: string): Promise<number>;
  getForegroundApp(): Promise<string | null>;
}

export interface AppListNativeModule {
  getInstalledApps(): Promise<import('./domain.types').AppInfo[]>;
}
