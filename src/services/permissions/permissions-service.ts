import { UsageStatsAdapter } from '../../data/local/native/usage-stats-adapter';

const PermissionsService = {
  hasUsagePermission: async (): Promise<boolean> => {
    return UsageStatsAdapter.hasPermission();
  },

  requestUsagePermission: (): void => {
    UsageStatsAdapter.requestPermission();
  },
};

export default PermissionsService;
