import { MonitorStatus } from '@core/types/native.types';
import { describeMonitorHealth } from '@features/home/monitor-health';

const NOW = 1_700_000_000_000;

const status = (overrides: Partial<MonitorStatus> = {}): MonitorStatus => ({
  enabled: true,
  running: true,
  lastHeartbeatAt: NOW - 5_000,
  lastStopReason: null,
  health: [],
  ...overrides,
});

describe('describeMonitorHealth', () => {
  it('says monitoring is off when the status is unknown', () => {
    expect(describeMonitorHealth(null, NOW)).toEqual({
      tone: 'off',
      headline: 'Monitoring is off',
      details: [],
    });
  });

  it('says monitoring is off when the user has not turned it on', () => {
    expect(describeMonitorHealth(status({ enabled: false }), NOW).tone).toBe(
      'off',
    );
  });

  it('says it is active, and when it last checked, when everything is fine', () => {
    const result = describeMonitorHealth(status(), NOW);

    expect(result.tone).toBe('ok');
    expect(result.headline).toBe('Monitoring is active');
    expect(result.details).toEqual(['Last checked just now']);
  });

  it.each([
    [5_000, 'just now'],
    [45_000, '45s ago'],
    [90_000, '2 min ago'],
  ])('describes a check %ims ago as "%s"', (age, text) => {
    const result = describeMonitorHealth(
      status({ lastHeartbeatAt: NOW - age }),
      NOW,
    );

    expect(result.tone).toBe('ok');
    expect(result.details[0]).toContain(text);
  });

  it('says it is starting when the user wants monitoring but it is not running yet', () => {
    const result = describeMonitorHealth(status({ running: false }), NOW);

    expect(result.tone).toBe('warning');
    expect(result.headline).toBe('Monitoring is starting');
  });

  it('asks for attention and lists each problem in plain words', () => {
    const result = describeMonitorHealth(
      status({ health: ['USAGE_ACCESS_MISSING', 'OVERLAY_MISSING'] }),
      NOW,
    );

    expect(result.tone).toBe('warning');
    expect(result.headline).toBe('Monitoring needs attention');
    expect(result.details).toHaveLength(2);
    expect(result.details[0]).toContain('Usage access');
    expect(result.details[1]).toContain('Display over other apps');
  });

  it.each([
    'USAGE_ACCESS_MISSING',
    'OVERLAY_MISSING',
    'NOTIFICATIONS_BLOCKED',
    'BATTERY_OPTIMIZED',
    'RULES_UNREADABLE',
    'INTENT_UNKNOWN',
    'POLL_FAILING',
    'EJECT_INEFFECTIVE',
  ])('has a plain-language message for %s', (issue) => {
    const [message] = describeMonitorHealth(
      status({ health: [issue] }),
      NOW,
    ).details;

    expect(message.length).toBeGreaterThan(20);
    expect(message).not.toContain(issue);
  });

  it('still shows a problem it does not recognise, rather than hiding it', () => {
    const result = describeMonitorHealth(
      status({ health: ['FROM_A_NEWER_VERSION'] }),
      NOW,
    );

    expect(result.tone).toBe('warning');
    expect(result.details[0]).toContain('FROM_A_NEWER_VERSION');
  });

  it('warns when the monitor says it is running but has not checked in for a long time', () => {
    const result = describeMonitorHealth(
      status({ lastHeartbeatAt: NOW - 10 * 60_000 }),
      NOW,
    );

    expect(result.tone).toBe('warning');
    expect(result.details.join(' ')).toContain('10 min');
  });

  it('does not call a brand new monitor stuck just because no heartbeat exists yet', () => {
    const result = describeMonitorHealth(
      status({ lastHeartbeatAt: null }),
      NOW,
    );

    expect(result.tone).toBe('ok');
  });
});
