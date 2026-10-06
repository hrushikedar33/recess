import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useReduceMotion } from './use-reduce-motion';

/** A slow breathing scale while [active]; at rest (1) otherwise, and always at rest with reduce-motion. */
export function usePulse(active: boolean, peak = 1.12): Animated.Value {
  const reduce = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!active || reduce) {
      scale.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: peak,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      scale.setValue(1);
    };
  }, [active, reduce, peak, scale]);

  return scale;
}
