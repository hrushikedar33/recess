import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useReduceMotion } from './use-reduce-motion';

/** Fades and slides an element in once, after [delayMs]. Apply the result to an `Animated.View` style. */
export function useEntrance(delayMs = 0, distance = 16) {
  const reduce = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      return undefined;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      delay: delayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reduce, delayMs, progress]);

  return useMemo(
    () => ({
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [distance, 0],
          }),
        },
      ],
    }),
    [progress, distance],
  );
}
