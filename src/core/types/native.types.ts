export interface UsageStatsNativeModule {
  hasPermission(): Promise<boolean>;
  requestPermission(): void;
  getAppUsageToday(packageName: string): Promise<number>;
  getForegroundApp(): Promise<string | null>;
  sendAppToHome(): void;
  bringAppToForeground(): void;
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): void;
  showLimitNotification(title: string, message: string): void;
  isBatteryOptimizationIgnored(): Promise<boolean>;
  requestIgnoreBatteryOptimization(): void;
}

export interface AppListNativeModule {
  getInstalledApps(): Promise<import('./domain.types').AppInfo[]>;
  getAppIcon(packageName: string): Promise<string | null>;
}
