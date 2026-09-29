import { NativeModules } from 'react-native';

// Importing the mock file does not install it; the module must be replaced explicitly.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  ),
);

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

Object.assign(NativeModules, {
  UsageStatsModule: {
    hasPermission: jest.fn(async () => false),
    requestPermission: jest.fn(),
    hasOverlayPermission: jest.fn(async () => false),
    requestOverlayPermission: jest.fn(),
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
      health: [],
    })),
    getLimitEvent: jest.fn(async () => null),
    syncBlockedApps: jest.fn(async () => undefined),
    syncGoals: jest.fn(async () => undefined),
  },
});
