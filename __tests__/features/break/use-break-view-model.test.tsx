import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { BackHandler, Linking, NativeModules } from 'react-native';
import { GOALS_STORAGE_KEY } from '@core/constants/storage.keys';
import { copy } from '@shared/copy';
import { LimitEvent } from '@core/types/native.types';
import { useBreakViewModel } from '@features/break/use-break-view-model';

const mockNavigation = {
  canGoBack: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
};

// Run the "on focus" effect once on mount, without a navigation container.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useFocusEffect: (effect: () => void) => useEffect(() => effect(), []),
    useNavigation: () => mockNavigation,
  };
});

const monitor = NativeModules.MonitorConfigModule;
const systemUi = NativeModules.SystemUiModule;
const NOW = 1_700_000_000_000;

const event = (overrides: Partial<LimitEvent> = {}): LimitEvent => ({
  packageName: 'com.instagram.android',
  appName: 'Instagram',
  reason: 'SESSION_COOLDOWN',
  blockedUntilMs: NOW + 90_000,
  createdAtMs: NOW,
  quote: {
    text: 'Confine yourself to the present.',
    author: 'Marcus Aurelius',
    source: 'Meditations 7.29',
  },
  ...overrides,
});

const storedEvent = (overrides: Partial<LimitEvent> = {}) =>
  monitor.getLimitEvent.mockResolvedValue(JSON.stringify(event(overrides)));

const storedGoal = (id: string, done = false) => ({
  id,
  title: `Goal ${id}`,
  done,
  createdAt: 1,
});

const renderBreak = async () => {
  const hook = renderHook(() => useBreakViewModel());
  await waitFor(() => expect(hook.result.current.status).not.toBe('loading'));
  return hook;
};

describe('useBreakViewModel', () => {
  let urlHandlers: ((event: { url: string }) => void)[];

  beforeEach(async () => {
    jest.useFakeTimers({ now: NOW });
    await AsyncStorage.clear();
    monitor.getLimitEvent.mockReset().mockResolvedValue(null);
    mockNavigation.canGoBack.mockReset().mockReturnValue(true);
    mockNavigation.goBack.mockReset();
    mockNavigation.reset.mockReset();
    urlHandlers = [];
    jest.spyOn(Linking, 'addEventListener').mockImplementation(((
      _type: string,
      handler: (event: { url: string }) => void,
    ) => {
      urlHandlers.push(handler);
      return { remove: jest.fn() };
    }) as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows the app, the quote and its author from the last limit event', async () => {
    storedEvent();

    const { result } = await renderBreak();

    expect(result.current.status).toBe('active');
    expect(result.current.event?.appName).toBe('Instagram');
    expect(result.current.event?.quote).toMatchObject({
      text: 'Confine yourself to the present.',
      author: 'Marcus Aurelius',
    });
  });

  it('shows the time left until the app opens again', async () => {
    storedEvent({ blockedUntilMs: NOW + 90_000 });

    const { result } = await renderBreak();

    expect(result.current.countdownText).toBe('1:30');
  });

  it('counts down as time passes', async () => {
    storedEvent({ blockedUntilMs: NOW + 90_000 });
    const { result } = await renderBreak();

    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    expect(result.current.countdownText).toBe('1:00');
  });

  it('says the break is over once the time has passed', async () => {
    storedEvent({ blockedUntilMs: NOW + 5_000 });
    const { result } = await renderBreak();

    act(() => {
      jest.advanceTimersByTime(6_000);
    });

    expect(result.current.status).toBe('over');
  });

  it('treats an event whose break already ended as over, not as an active countdown', async () => {
    storedEvent({ blockedUntilMs: NOW - 1_000 });

    const { result } = await renderBreak();

    expect(result.current.status).toBe('over');
  });

  it('describes a daily limit as done for today, with no countdown', async () => {
    storedEvent({ reason: 'DAILY_LIMIT', blockedUntilMs: NOW + 5 * 3_600_000 });

    const { result } = await renderBreak();

    expect(result.current.isDaily).toBe(true);
    expect(result.current.headline).toBe(copy.break.daily.headline);
    expect(result.current.detail).toBe(copy.break.daily.detail('Instagram'));
    expect(result.current.countdownText).toBe('');
  });

  it('shows an empty state when there has been no limit event', async () => {
    const { result } = await renderBreak();

    expect(result.current.status).toBe('none');
    expect(result.current.event).toBeNull();
  });

  it("lists the user's goals so they can be ticked off right here", async () => {
    storedEvent();
    await AsyncStorage.setItem(
      GOALS_STORAGE_KEY,
      JSON.stringify([storedGoal('a'), storedGoal('b', true)]),
    );

    const { result } = await renderBreak();

    await waitFor(() => expect(result.current.goals).toHaveLength(2));
  });

  it('saves a goal that is ticked here', async () => {
    storedEvent();
    await AsyncStorage.setItem(
      GOALS_STORAGE_KEY,
      JSON.stringify([storedGoal('a')]),
    );
    const { result } = await renderBreak();
    await waitFor(() => expect(result.current.goals).toHaveLength(1));

    await act(async () => {
      await result.current.handleToggleGoal('a');
    });

    expect(result.current.goals[0].done).toBe(true);
    expect(await AsyncStorage.getItem(GOALS_STORAGE_KEY)).toContain(
      '"done":true',
    );
  });

  it('takes the user to the real home screen when they are done', async () => {
    storedEvent();
    const exitApp = jest
      .spyOn(BackHandler, 'exitApp')
      .mockImplementation(() => undefined);
    const { result } = await renderBreak();

    await act(async () => {
      await result.current.handleDone();
    });

    expect(systemUi.goHome).toHaveBeenCalledTimes(1);
    // Exiting would only reveal the paused app underneath this screen.
    expect(exitApp).not.toHaveBeenCalled();
  });

  it('still lets the user out if the home screen cannot be started', async () => {
    storedEvent();
    systemUi.goHome.mockRejectedValueOnce({ code: 'NO_ACTIVITY' });
    const exitApp = jest
      .spyOn(BackHandler, 'exitApp')
      .mockImplementation(() => undefined);
    const { result } = await renderBreak();

    await act(async () => {
      await result.current.handleDone();
    });

    expect(exitApp).toHaveBeenCalledTimes(1);
  });

  it('still lets the user out when the native module is missing', async () => {
    storedEvent();
    const original = NativeModules.SystemUiModule;
    NativeModules.SystemUiModule = undefined;
    const exitApp = jest
      .spyOn(BackHandler, 'exitApp')
      .mockImplementation(() => undefined);
    const { result } = await renderBreak();

    await act(async () => {
      await result.current.handleDone();
    });

    NativeModules.SystemUiModule = original;
    expect(exitApp).toHaveBeenCalledTimes(1);
  });

  it('never keeps the user inside Recess: done does not navigate to another Recess screen', async () => {
    storedEvent();
    jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => undefined);
    const { result } = await renderBreak();

    await act(async () => {
      await result.current.handleDone();
    });

    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    expect(mockNavigation.reset).not.toHaveBeenCalled();
  });

  it('hides the system bars while the screen is showing and brings them back after', async () => {
    storedEvent();
    systemUi.setImmersive.mockClear();

    const { unmount } = await renderBreak();
    expect(systemUi.setImmersive).toHaveBeenLastCalledWith(true);

    unmount();

    expect(systemUi.setImmersive).toHaveBeenLastCalledWith(false);
  });

  it('shows the new event when another limit is reached while the screen is open', async () => {
    storedEvent();
    const { result } = await renderBreak();
    expect(result.current.event?.appName).toBe('Instagram');

    storedEvent({
      appName: 'YouTube',
      packageName: 'com.google.android.youtube',
    });
    await act(async () => {
      urlHandlers.forEach((handler) => handler({ url: 'recess://break' }));
    });

    await waitFor(() => expect(result.current.event?.appName).toBe('YouTube'));
  });
});
