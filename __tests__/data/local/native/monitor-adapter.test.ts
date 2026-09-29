import { NativeModules } from 'react-native';
import { AppError } from '@core/errors/app-error';
import { BlockedApp } from '@core/types/domain.types';
import { MonitorAdapter } from '@data/local/native/monitor-adapter';

const native = NativeModules.MonitorConfigModule;

const instagram: BlockedApp = {
  packageName: 'com.instagram.android',
  appName: 'Instagram',
  limitMinutes: 10,
  cooldownMinutes: 5,
  isActive: true,
  iconBase64: 'data:image/png;base64,AAAA',
};

const sentJson = (method: jest.Mock): unknown =>
  JSON.parse(method.mock.calls[0][0] as string);

describe('MonitorAdapter', () => {
  it('forwards the enabled flag to the native module', async () => {
    await MonitorAdapter.setMonitoringEnabled(true);

    expect(native.setMonitoringEnabled).toHaveBeenCalledWith(true);
  });

  it('returns the native status unchanged', async () => {
    const status = {
      enabled: true,
      running: true,
      lastHeartbeatAt: 1700000000000,
      lastStopReason: 'task_removed',
    };
    native.getMonitorStatus.mockResolvedValueOnce(status);

    await expect(MonitorAdapter.getMonitorStatus()).resolves.toEqual(status);
  });

  it('syncs blocked apps as JSON without the icon', async () => {
    await MonitorAdapter.syncBlockedApps([instagram]);

    expect(sentJson(native.syncBlockedApps)).toEqual([
      {
        packageName: 'com.instagram.android',
        appName: 'Instagram',
        limitMinutes: 10,
        cooldownMinutes: 5,
        isActive: true,
      },
    ]);
  });

  it('syncs an empty rule list as an empty JSON list', async () => {
    await MonitorAdapter.syncBlockedApps([]);

    expect(sentJson(native.syncBlockedApps)).toEqual([]);
  });

  it('syncs goals as JSON with only id, title and done', async () => {
    await MonitorAdapter.syncGoals([
      { id: 'g1', title: 'Finish the report', done: false },
    ]);

    expect(sentJson(native.syncGoals)).toEqual([
      { id: 'g1', title: 'Finish the report', done: false },
    ]);
  });

  it('turns a native rejection into an AppError that keeps its code and message', async () => {
    native.syncGoals.mockRejectedValueOnce(
      Object.assign(new Error('goals: not a JSON list'), {
        code: 'INVALID_CONFIG',
      }),
    );

    const failure = await MonitorAdapter.syncGoals([]).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(AppError);
    expect(failure).toMatchObject({
      code: 'INVALID_CONFIG',
      message: 'goals: not a JSON list',
    });
  });

  it('uses a generic code when the native rejection has none', async () => {
    native.getMonitorStatus.mockRejectedValueOnce(new Error('boom'));

    await expect(MonitorAdapter.getMonitorStatus()).rejects.toMatchObject({
      code: 'MONITOR_ERROR',
      message: 'boom',
    });
  });

  describe('when the native module is missing', () => {
    let original: unknown;

    beforeEach(() => {
      original = NativeModules.MonitorConfigModule;
      delete NativeModules.MonitorConfigModule;
    });

    afterEach(() => {
      NativeModules.MonitorConfigModule = original;
    });

    it('rejects with NATIVE_UNAVAILABLE instead of crashing', async () => {
      await expect(
        MonitorAdapter.setMonitoringEnabled(true),
      ).rejects.toMatchObject({ code: 'NATIVE_UNAVAILABLE' });
    });
  });
});

describe('MonitorAdapter.getLimitEvent', () => {
  const event = {
    packageName: 'com.instagram.android',
    appName: 'Instagram',
    reason: 'SESSION_COOLDOWN',
    blockedUntilMs: 1700000300000,
    createdAtMs: 1700000000000,
    quote: {
      text: 'Confine yourself to the present.',
      author: 'Marcus Aurelius',
      source: 'Meditations 7.29',
    },
  };

  it('returns the saved limit event, parsed', async () => {
    native.getLimitEvent.mockResolvedValueOnce(JSON.stringify(event));

    await expect(MonitorAdapter.getLimitEvent()).resolves.toEqual(event);
  });

  it('accepts a quote without a source', async () => {
    const plain = { ...event, quote: { text: 'Begin.', author: 'Seneca' } };
    native.getLimitEvent.mockResolvedValueOnce(JSON.stringify(plain));

    await expect(MonitorAdapter.getLimitEvent()).resolves.toEqual(plain);
  });

  it('returns null when there is no event', async () => {
    native.getLimitEvent.mockResolvedValueOnce(null);

    await expect(MonitorAdapter.getLimitEvent()).resolves.toBeNull();
  });

  it.each([
    ['corrupt json', '{corrupt'],
    ['not an object', '[]'],
    ['a missing app name', JSON.stringify({ ...event, appName: undefined })],
    [
      'an unknown reason',
      JSON.stringify({ ...event, reason: 'FROM_THE_FUTURE' }),
    ],
    [
      'a non-numeric end time',
      JSON.stringify({ ...event, blockedUntilMs: 'soon' }),
    ],
    ['a missing quote', JSON.stringify({ ...event, quote: undefined })],
    [
      'a quote without an author',
      JSON.stringify({ ...event, quote: { text: 'x' } }),
    ],
  ])('returns null for %s instead of throwing', async (_name, raw) => {
    native.getLimitEvent.mockResolvedValueOnce(raw);

    await expect(MonitorAdapter.getLimitEvent()).resolves.toBeNull();
  });
});
