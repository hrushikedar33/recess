import '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { NativeModules } from 'react-native';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('react-native-background-actions', () => ({
  __esModule: true,
  default: {
    start: jest.fn(async () => undefined),
    stop: jest.fn(async () => undefined),
    isRunning: jest.fn(() => false),
  },
}));

Object.assign(NativeModules, {
  UsageStatsModule: {
    hasPermission: jest.fn(async () => false),
    requestPermission: jest.fn(),
    getAppUsageToday: jest.fn(async () => 0),
    getForegroundApp: jest.fn(async () => null),
    sendAppToHome: jest.fn(),
    bringAppToForeground: jest.fn(),
    hasOverlayPermission: jest.fn(async () => false),
    requestOverlayPermission: jest.fn(),
    showLimitNotification: jest.fn(),
    isBatteryOptimizationIgnored: jest.fn(async () => false),
    requestIgnoreBatteryOptimization: jest.fn(),
  },
  AppListModule: {
    getInstalledApps: jest.fn(async () => []),
    getAppIcon: jest.fn(async () => null),
  },
  MonitorConfigModule: {
    setMonitoringEnabled: jest.fn(async () => undefined),
    getMonitorStatus: jest.fn(async () => ({
      enabled: false,
      running: false,
      lastHeartbeatAt: null,
      lastStopReason: null,
    })),
    syncBlockedApps: jest.fn(async () => undefined),
    syncGoals: jest.fn(async () => undefined),
  },
});
