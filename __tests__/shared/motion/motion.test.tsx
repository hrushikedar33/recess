import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo, Platform, Vibration } from 'react-native';
import { success, tick } from '@shared/motion/haptics';
import { staggerDelay } from '@shared/motion/stagger';
import { useEntrance } from '@shared/motion/use-entrance';
import { usePressScale } from '@shared/motion/use-press-scale';
import { usePulse } from '@shared/motion/use-pulse';
import { useReduceMotion } from '@shared/motion/use-reduce-motion';

const info = AccessibilityInfo as unknown as {
  isReduceMotionEnabled: jest.Mock;
  addEventListener: jest.Mock;
};

const valueOf = (animated: unknown): number =>
  (animated as { __getValue: () => number }).__getValue();

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

let removeListener: jest.Mock;
let onChange: ((value: boolean) => void) | undefined;

const setReduceMotion = (enabled: boolean) => {
  info.isReduceMotionEnabled.mockResolvedValue(enabled);
};

beforeEach(() => {
  jest.useFakeTimers();
  removeListener = jest.fn();
  onChange = undefined;
  info.addEventListener.mockImplementation(
    (_event: string, handler: (value: boolean) => void) => {
      onChange = handler;
      return { remove: removeListener };
    },
  );
  setReduceMotion(false);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('staggerDelay', () => {
  it('grows by a fixed step per item', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(1)).toBe(45);
    expect(staggerDelay(3)).toBe(135);
  });

  it('is capped so a long list does not make the last rows wait', () => {
    expect(staggerDelay(100)).toBe(360);
    expect(staggerDelay(100, 20, 100)).toBe(100);
  });

  it('treats a bad index as no delay', () => {
    expect(staggerDelay(-3)).toBe(0);
    expect(staggerDelay(Number.NaN)).toBe(0);
  });
});

describe('useReduceMotion', () => {
  it('is off until the system says otherwise', async () => {
    const { result } = renderHook(() => useReduceMotion());
    await flush();

    expect(result.current).toBe(false);
  });

  it('follows the system setting', async () => {
    setReduceMotion(true);

    const { result } = renderHook(() => useReduceMotion());
    await flush();

    expect(result.current).toBe(true);
  });

  it('follows the setting when it changes while the app is open', async () => {
    const { result } = renderHook(() => useReduceMotion());
    await flush();

    act(() => onChange?.(true));

    expect(result.current).toBe(true);
  });

  it('stops listening when it goes away', async () => {
    const { unmount } = renderHook(() => useReduceMotion());
    await flush();

    unmount();

    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('survives a platform that cannot report the setting', async () => {
    info.isReduceMotionEnabled.mockRejectedValue(new Error('unsupported'));

    const { result } = renderHook(() => useReduceMotion());
    await flush();

    expect(result.current).toBe(false);
  });
});

describe('useEntrance', () => {
  it('starts hidden and offset, then eases in', async () => {
    const { result } = renderHook(() => useEntrance(0, 16));
    await flush();

    expect(valueOf(result.current.opacity)).toBe(0);

    await advance(500);

    expect(valueOf(result.current.opacity)).toBe(1);
  });

  it('waits for its delay before it starts', async () => {
    const { result } = renderHook(() => useEntrance(300, 16));
    await flush();

    await advance(200);
    expect(valueOf(result.current.opacity)).toBe(0);

    await advance(600);
    expect(valueOf(result.current.opacity)).toBe(1);
  });

  it('is simply there, with no motion, when reduce-motion is on', async () => {
    setReduceMotion(true);

    const { result } = renderHook(() => useEntrance(300, 16));
    await flush();

    expect(valueOf(result.current.opacity)).toBe(1);
  });
});

describe('usePressScale', () => {
  it('shrinks while pressed and springs back on release', async () => {
    const { result } = renderHook(() => usePressScale());
    await flush();
    expect(valueOf(result.current.scale)).toBe(1);

    act(() => result.current.onPressIn());
    await advance(400);
    expect(valueOf(result.current.scale)).toBeLessThan(1);

    act(() => result.current.onPressOut());
    await advance(800);
    expect(valueOf(result.current.scale)).toBeCloseTo(1, 2);
  });

  it('does not move at all when reduce-motion is on', async () => {
    setReduceMotion(true);
    const { result } = renderHook(() => usePressScale());
    await flush();

    act(() => result.current.onPressIn());
    await advance(400);

    expect(valueOf(result.current.scale)).toBe(1);
  });
});

describe('usePulse', () => {
  it('stays still while inactive', async () => {
    const { result } = renderHook(() => usePulse(false));
    await flush();

    await advance(2000);

    expect(valueOf(result.current)).toBe(1);
  });

  it('breathes while active', async () => {
    const { result } = renderHook(() => usePulse(true));
    await flush();

    await advance(900);

    expect(valueOf(result.current)).toBeGreaterThan(1);
  });

  it('goes back to rest when switched off', async () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => usePulse(active),
      { initialProps: { active: true } },
    );
    await flush();
    await advance(900);

    rerender({ active: false });
    await advance(100);

    expect(valueOf(result.current)).toBe(1);
  });

  it('never loops when reduce-motion is on', async () => {
    setReduceMotion(true);
    const { result } = renderHook(() => usePulse(true));
    await flush();

    await advance(2000);

    expect(valueOf(result.current)).toBe(1);
  });

  it('leaves nothing running after it unmounts', async () => {
    const { unmount } = renderHook(() => usePulse(true));
    await flush();
    await advance(500);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('haptics', () => {
  beforeEach(() => {
    jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gives a short tick on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    tick();

    expect(Vibration.vibrate).toHaveBeenCalledWith(10);
  });

  it('gives a two-beat pattern for a success', () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    success();

    expect(Vibration.vibrate).toHaveBeenCalledWith([0, 12, 50, 18]);
  });

  it('does nothing off Android', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    tick();
    success();

    expect(Vibration.vibrate).not.toHaveBeenCalled();
  });

  it('never throws, even if the device refuses to vibrate', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    (Vibration.vibrate as jest.Mock).mockImplementation(() => {
      throw new Error('no vibrator');
    });

    expect(() => tick()).not.toThrow();
  });
});
