import { NativeModules } from 'react-native';
import PermissionsService from '@services/permissions/permissions-service';

const native = NativeModules.UsageStatsModule;

describe('PermissionsService', () => {
  it('reports usage access from the native module', async () => {
    native.hasPermission.mockResolvedValueOnce(true);

    await expect(PermissionsService.hasUsagePermission()).resolves.toBe(true);
  });

  it('reports the overlay permission from the native module', async () => {
    native.hasOverlayPermission.mockResolvedValueOnce(true);

    await expect(PermissionsService.hasOverlayPermission()).resolves.toBe(true);
  });

  it('reports whether battery optimization is ignored', async () => {
    native.isBatteryOptimizationIgnored.mockResolvedValueOnce(false);

    await expect(
      PermissionsService.isBatteryOptimizationIgnored(),
    ).resolves.toBe(false);
  });

  it('opens the matching system settings screens', () => {
    PermissionsService.requestUsagePermission();
    PermissionsService.requestOverlayPermission();
    PermissionsService.requestIgnoreBatteryOptimization();

    expect(native.requestPermission).toHaveBeenCalledTimes(1);
    expect(native.requestOverlayPermission).toHaveBeenCalledTimes(1);
    expect(native.requestIgnoreBatteryOptimization).toHaveBeenCalledTimes(1);
  });
});
