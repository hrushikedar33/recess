import { useCallback, useState } from 'react';
import { Animated } from 'react-native';
import { useReduceMotion } from './use-reduce-motion';

/** A springy "squish" while something is pressed. Use `scale` in a transform and wire the handlers to a Pressable. */
export function usePressScale(pressedScale = 0.96) {
  const reduce = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));

  const springTo = useCallback(
    (toValue: number) => {
      if (reduce) {
        return;
      }
      Animated.spring(scale, {
        toValue,
        speed: 40,
        bounciness: 8,
        useNativeDriver: true,
      }).start();
    },
    [reduce, scale],
  );

  const onPressIn = useCallback(
    () => springTo(pressedScale),
    [springTo, pressedScale],
  );
  const onPressOut = useCallback(() => springTo(1), [springTo]);

  return { scale, onPressIn, onPressOut };
}
