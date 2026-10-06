import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReduceMotion } from '../motion/use-reduce-motion';
import { palette, radius } from '../theme/tokens';

interface ProgressBarProps {
  /** 0 (empty) to 1 (full); anything else is clamped, and a bad number counts as empty. */
  progress: number;
  /** What a screen reader says, such as "2 of 5 done". */
  label: string;
}

const clamp = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/** A slim bar that fills smoothly. The width is animated on the JS driver (layout cannot use the native one). */
export function ProgressBar({ progress, label }: ProgressBarProps) {
  const reduce = useReduceMotion();
  const value = clamp(progress);
  const [fill] = useState(() => new Animated.Value(value));

  useEffect(() => {
    if (reduce) {
      fill.setValue(value);
      return;
    }
    Animated.timing(fill, {
      toValue: value,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, reduce, fill]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={styles.track}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width: fill.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.raised,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
  },
});
