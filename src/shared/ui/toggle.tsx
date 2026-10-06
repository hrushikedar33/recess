import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { tick } from '../motion/haptics';
import { useReduceMotion } from '../motion/use-reduce-motion';
import { palette, radius } from '../theme/tokens';
import { PressableScale } from './pressable-scale';

interface ToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

const TRACK_WIDTH = 56;
const TRACK_HEIGHT = 32;
const THUMB = 24;
const INSET = 4;

/** A switch with a sliding thumb. Reports the opposite of its value, once per press. */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
}: ToggleProps) {
  const reduce = useReduceMotion();
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    if (reduce) {
      position.setValue(value ? 1 : 0);
      return;
    }
    Animated.spring(position, {
      toValue: value ? 1 : 0,
      speed: 30,
      bounciness: 10,
      useNativeDriver: true,
    }).start();
  }, [value, reduce, position]);

  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      disabled={disabled}
      style={[styles.track, value && styles.trackOn, disabled && styles.dim]}
      onPress={() => {
        tick();
        onValueChange(!value);
      }}
    >
      <Animated.View
        style={[
          styles.thumb,
          value && styles.thumbOn,
          {
            transform: [
              {
                translateX: position.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, TRACK_WIDTH - THUMB - INSET * 2],
                }),
              },
            ],
          },
        ]}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    padding: INSET,
    backgroundColor: palette.raised,
    borderWidth: 1,
    borderColor: palette.border,
  },
  trackOn: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: palette.textSecondary,
  },
  thumbOn: {
    backgroundColor: palette.onPrimary,
  },
  dim: {
    opacity: 0.5,
  },
});
