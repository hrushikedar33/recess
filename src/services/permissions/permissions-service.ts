import { UsageStatsAdapter } from '../../data/local/native/usage-stats-adapter';

const PermissionsService = {
  hasUsagePermission: async (): Promise<boolean> => {
    return UsageStatsAdapter.hasPermission();
  },

  requestUsagePermission: (): void => {
    UsageStatsAdapter.requestPermission();
  },

  hasOverlayPermission: async (): Promise<boolean> => {
    return UsageStatsAdapter.hasOverlayPermission();
  },

  requestOverlayPermission: (): void => {
    UsageStatsAdapter.requestOverlayPermission();
  },

  isBatteryOptimizationIgnored: async (): Promise<boolean> => {
    return UsageStatsAdapter.isBatteryOptimizationIgnored();
  },

  requestIgnoreBatteryOptimization: (): void => {
    UsageStatsAdapter.requestIgnoreBatteryOptimization();
  },
};

export default PermissionsService;
