export interface OemGuidance {
  title: string;
  steps: string;
}

const BATTERY_STEPS: OemGuidance = {
  title: 'Keep Recess running on your phone',
  steps:
    'Open Settings, then Battery, then App battery management (or "Battery optimization"), choose Recess and allow background activity. Also turn on Auto-launch for Recess if you see that option.',
};

const XIAOMI_STEPS: OemGuidance = {
  title: 'Keep Recess running on your phone',
  steps:
    'Open Settings, then Apps, then Manage apps, choose Recess, turn on Autostart and set Battery saver to No restrictions.',
};

const SAMSUNG_STEPS: OemGuidance = {
  title: 'Keep Recess running on your phone',
  steps:
    'Open Settings, then Battery, then Background usage limits, and add Recess to "Never sleeping apps".',
};

/**
 * Plain steps for phone makers whose battery managers are known to stop background apps.
 * Deliberately no deep links into vendor screens: those break between versions.
 */
export function oemGuidance(
  manufacturer: string | undefined,
): OemGuidance | null {
  const maker = (manufacturer ?? '').trim().toLowerCase();
  if (['oneplus', 'oppo', 'realme'].includes(maker)) {
    return BATTERY_STEPS;
  }
  if (['xiaomi', 'redmi', 'poco'].includes(maker)) {
    return XIAOMI_STEPS;
  }
  if (maker === 'samsung') {
    return SAMSUNG_STEPS;
  }
  return null;
}
