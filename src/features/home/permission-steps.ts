export type PermissionStep = 'usage' | 'overlay' | 'battery';

export interface PermissionState {
  usage: boolean;
  overlay: boolean;
  battery: boolean;
}

/**
 * The permissions are always asked for in this one order, whether the ask comes from the banner or
 * from the ON toggle. Null means nothing is missing.
 */
export const nextMissingPermission = (
  state: PermissionState,
): PermissionStep | null => {
  if (!state.usage) {
    return 'usage';
  }
  if (!state.overlay) {
    return 'overlay';
  }
  if (!state.battery) {
    return 'battery';
  }
  return null;
};

export const PERMISSION_BANNER_TEXT: Record<PermissionStep, string> = {
  usage: '⚠️ Grant Usage Access permission to enable tracking',
  overlay: '⚠️ Grant "Display over other apps" permission to enable blocking',
  battery: '🔋 Disable battery optimization to keep Recess active',
};
