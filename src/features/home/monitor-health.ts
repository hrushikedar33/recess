import { MonitorStatus } from '../../core/types/native.types';

export type HealthTone = 'off' | 'ok' | 'warning';

export interface MonitorHealthView {
  tone: HealthTone;
  headline: string;
  details: string[];
  /** True when the user can fix a reported problem on the app's own system settings page. */
  opensSettings: boolean;
}

/** Problems the user resolves in the app's own settings (notification and battery switches). */
const FIXED_IN_APP_SETTINGS = ['NOTIFICATIONS_BLOCKED', 'BATTERY_OPTIMIZED'];

const MESSAGES: Record<string, string> = {
  USAGE_ACCESS_MISSING:
    'Usage access is off, so Recess cannot see which app is open.',
  OVERLAY_MISSING:
    'Display over other apps is off, so Recess cannot send you to the home screen.',
  NOTIFICATIONS_BLOCKED:
    'Notifications are blocked, so you will not see limit alerts.',
  BATTERY_OPTIMIZED:
    'Battery optimization is on and may close Recess in the background.',
  RULES_UNREADABLE:
    'Your saved apps could not be read by the monitor. Open Add App and save them again.',
  INTENT_UNKNOWN:
    'Recess could not read its own settings, so it kept monitoring to be safe.',
  POLL_FAILING: 'Recess cannot read app usage right now.',
  EJECT_INEFFECTIVE:
    'Sending you to the home screen is not working. Check "Display over other apps".',
};

/** A check-in older than this while "running" suggests the monitor is stuck. */
const STALE_HEARTBEAT_MS = 2 * 60_000;

export function formatAgo(elapsedMs: number): string {
  const seconds = Math.max(0, Math.round(elapsedMs / 1000));
  if (seconds < 10) {
    return 'just now';
  }
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  return `${Math.round(minutes / 60)} h ago`;
}

export function describeMonitorHealth(
  status: MonitorStatus | null,
  nowMs: number,
): MonitorHealthView {
  if (!status || !status.enabled) {
    return {
      tone: 'off',
      headline: 'Monitoring is off',
      details: [],
      opensSettings: false,
    };
  }
  if (!status.running) {
    return {
      tone: 'warning',
      headline: 'Monitoring is starting',
      details: [],
      opensSettings: false,
    };
  }

  const problems = status.health.map(
    (issue) => MESSAGES[issue] ?? `A problem was reported: ${issue}.`,
  );
  const sinceCheckIn =
    status.lastHeartbeatAt === null ? 0 : nowMs - status.lastHeartbeatAt;
  if (sinceCheckIn > STALE_HEARTBEAT_MS) {
    problems.push(
      `The monitor has not checked in for ${formatAgo(sinceCheckIn).replace(
        ' ago',
        '',
      )}.`,
    );
  }

  if (problems.length > 0) {
    return {
      tone: 'warning',
      headline: 'Monitoring needs attention',
      details: problems,
      opensSettings: status.health.some((issue) =>
        FIXED_IN_APP_SETTINGS.includes(issue),
      ),
    };
  }
  return {
    tone: 'ok',
    headline: 'Monitoring is active',
    details:
      status.lastHeartbeatAt === null
        ? []
        : [`Last checked ${formatAgo(sinceCheckIn)}`],
    opensSettings: false,
  };
}
